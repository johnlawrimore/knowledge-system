import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const evidenceType = searchParams.get('evidence_type');
    const stance = searchParams.get('stance');
    const strength = searchParams.get('strength');
    const sourceId = searchParams.get('source_id');
    const credibility = searchParams.get('credibility');
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (evidenceType) {
      conditions.push('e.evidence_type = ?');
      params.push(evidenceType);
    }

    if (stance) {
      conditions.push('ce.stance = ?');
      params.push(stance);
    }

    if (strength) {
      conditions.push('ce.strength = ?');
      params.push(strength);
    }

    if (sourceId) {
      conditions.push('e.source_id = ?');
      params.push(Number(sourceId));
    }

    if (credibility) {
      conditions.push("COALESCE(JSON_EXTRACT(e.evaluation_results, '$.credibility'), 2) = ?");
      params.push(Number(credibility));
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const conn = await pool.getConnection();

    try {
      const [countRows] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT e.id) as total
         FROM evidence e
         LEFT JOIN claim_evidence ce ON e.id = ce.evidence_id
         ${whereClause}`,
        params
      );
      const total = Number(countRows[0].total);

      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT
           e.id,
           e.content,
           e.source_id,
           e.artifact_id,
           e.evidence_type,
           e.verbatim_quote,
           e.evaluation_results,
           e.derived_from_evidence_id,
           e.notes,
           e.created_at,
           s.title AS source_title,
           COUNT(DISTINCT ce.claim_id) AS claim_count
         FROM evidence e
         JOIN sources s ON e.source_id = s.id
         LEFT JOIN claim_evidence ce ON e.id = ce.evidence_id
         ${whereClause}
         GROUP BY e.id, e.content, e.source_id, e.artifact_id, e.evidence_type,
                  e.verbatim_quote, e.evaluation_results, e.derived_from_evidence_id,
                  e.notes, e.created_at, s.title
         ORDER BY e.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return NextResponse.json({
        evidence: rows,
        total,
        limit,
        offset,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Evidence list API error:', error);
    return NextResponse.json(
      { error: 'Failed to load evidence' },
      { status: 500 }
    );
  }
}
