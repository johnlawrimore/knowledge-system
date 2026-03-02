import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const conn = await pool.getConnection();

    try {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT
           p.id,
           p.name,
           p.affiliation,
           p.role,
           p.bio,
           p.avatar,
           p.website,
           p.sort_name,
           p.created_at,
           COALESCE(cs.source_count, 0) AS source_count,
           COALESCE(cs.claim_count, 0) AS claim_count,
           COALESCE(cs.evidence_count, 0) AS evidence_count,
           JSON_EXTRACT(p.evaluation_results, '$.tier') AS tier,
           JSON_EXTRACT(p.evaluation_results, '$.expertise') AS expertise,
           JSON_EXTRACT(p.evaluation_results, '$.authority') AS authority,
           JSON_EXTRACT(p.evaluation_results, '$.reach') AS reach,
           JSON_EXTRACT(p.evaluation_results, '$.reputation') AS reputation
         FROM contributors p
         LEFT JOIN v_contributor_scores cs ON p.id = cs.contributor_id
         ORDER BY p.sort_name ASC, p.name ASC`
      );

      return NextResponse.json({ contributors: rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Contributors list API error:', error);
    return NextResponse.json(
      { error: 'Failed to load contributors' },
      { status: 500 }
    );
  }
}
