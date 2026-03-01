import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clusterId = Number(id);
    if (isNaN(clusterId)) {
      return NextResponse.json({ error: 'Invalid cluster ID' }, { status: 400 });
    }

    const conn = await pool.getConnection();

    try {
      // Cluster detail from v_cluster_scores
      const [clusterRows] = await conn.query<RowDataPacket[]>(
        `SELECT
           cluster_id AS id,
           summary,
           reviewer_notes,
           claim_count,
           computed_confidence,
           score,
           supporting_sources,
           contradicting_sources,
           total_supporting_evidence,
           total_contradicting_evidence,
           total_qualifying_evidence,
           total_reasoning_count
         FROM v_cluster_scores
         WHERE cluster_id = ?`,
        [clusterId]
      );

      if (clusterRows.length === 0) {
        // Check if cluster exists but has no claims (not in v_cluster_scores)
        const [rawCluster] = await conn.query<RowDataPacket[]>(
          `SELECT id, summary, reviewer_notes, notes, created_at, updated_at
           FROM claim_clusters WHERE id = ?`,
          [clusterId]
        );

        if (rawCluster.length === 0) {
          return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
        }

        return NextResponse.json({
          ...rawCluster[0],
          claim_count: 0,
          computed_confidence: 'unsupported',
          score: 0,
          supporting_sources: 0,
          contradicting_sources: 0,
          claims: [],
        });
      }

      const cluster = clusterRows[0];

      // Member claims
      const [claims] = await conn.query<RowDataPacket[]>(
        `SELECT
           c.id, c.statement, c.claim_type,
           c.reviewer_notes, c.created_at
         FROM claims c
         WHERE c.cluster_id = ?
         ORDER BY c.id`,
        [clusterId]
      );

      // Combined evidence stats
      const [evidenceStats] = await conn.query<RowDataPacket[]>(
        `SELECT
           ce.stance,
           ce.strength,
           COUNT(*) AS count
         FROM claims c
         JOIN claim_evidence ce ON c.id = ce.claim_id
         WHERE c.cluster_id = ?
         GROUP BY ce.stance, ce.strength
         ORDER BY ce.stance, ce.strength`,
        [clusterId]
      );

      return NextResponse.json({
        ...cluster,
        claims,
        evidence_stats: evidenceStats,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Cluster detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to load cluster' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clusterId = Number(id);
    if (isNaN(clusterId)) {
      return NextResponse.json({ error: 'Invalid cluster ID' }, { status: 400 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.summary !== undefined) {
      updates.push('summary = ?');
      values.push(body.summary);
    }

    if (body.reviewer_notes !== undefined) {
      updates.push('reviewer_notes = ?');
      values.push(body.reviewer_notes);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(clusterId);

    const conn = await pool.getConnection();

    try {
      const [result] = await conn.query<ResultSetHeader>(
        `UPDATE claim_clusters SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Cluster update API error:', error);
    return NextResponse.json(
      { error: 'Failed to update cluster' },
      { status: 500 }
    );
  }
}
