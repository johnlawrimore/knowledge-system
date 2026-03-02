import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const conn = await pool.getConnection();

    try {
      // Pipeline status counts by source status
      const [pipelineRows] = await conn.query<RowDataPacket[]>(
        'SELECT status, COUNT(*) as count FROM sources GROUP BY status'
      );

      const pipeline: Record<string, number> = {};
      for (const row of pipelineRows) {
        pipeline[row.status] = Number(row.count);
      }

      // Attention items
      const [[collectedStuck]] = await conn.query<RowDataPacket[]>(
        "SELECT COUNT(*) as count FROM sources WHERE status = 'collected'"
      );

      const [[readyToDecompose]] = await conn.query<RowDataPacket[]>(
        "SELECT COUNT(*) as count FROM sources WHERE status = 'distilled'"
      );

      const [[uncategorized]] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM claims c
         WHERE NOT EXISTS (
           SELECT 1 FROM claim_topics ct WHERE ct.claim_id = c.id
         )`
      );

      const [[thinClaims]] = await conn.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM v_thin_claims'
      );

      const [[unsummarized]] = await conn.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM claim_clusters WHERE summary IS NULL'
      );

      const attention = [
        { label: 'Sources stuck in collected', count: Number(collectedStuck.count) },
        { label: 'Distilled sources ready to decompose', count: Number(readyToDecompose.count) },
        { label: 'Uncategorized claims', count: Number(uncategorized.count) },
        { label: 'Thin claims', count: Number(thinClaims.count) },
        { label: 'Unsummarized clusters', count: Number(unsummarized.count) },
      ];

      // Topic coverage (top 10)
      const [topicCoverage] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM v_topic_coverage ORDER BY claim_count DESC LIMIT 10'
      );

      // Theme strength (top 10)
      const [themeStrength] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM v_theme_strength ORDER BY claim_count DESC LIMIT 10'
      );

      // Aggregate counts
      const [[totalSources]] = await conn.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM sources'
      );
      const [[totalClaims]] = await conn.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM claims'
      );
      const [[totalEvidence]] = await conn.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM evidence'
      );
      const [[avgCredibility]] = await conn.query<RowDataPacket[]>(
        `SELECT AVG(
           COALESCE(JSON_EXTRACT(evaluation_results, '$.credibility'), 2)
         ) as avg_credibility FROM evidence`
      );

      const counts = {
        sources: Number(totalSources.count),
        claims: Number(totalClaims.count),
        evidence: Number(totalEvidence.count),
        avgCredibility: avgCredibility.avg_credibility
          ? Number(Number(avgCredibility.avg_credibility).toFixed(2))
          : null,
      };

      return NextResponse.json({
        pipeline,
        attention,
        topicCoverage,
        themeStrength,
        counts,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
