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
           p.url,
           p.created_at,
           COUNT(DISTINCT s.id) AS source_count,
           COUNT(DISTINCT ce.claim_id) AS claim_count
         FROM contributors p
         LEFT JOIN source_contributors sc ON p.id = sc.contributor_id
         LEFT JOIN sources s ON sc.source_id = s.id
         LEFT JOIN evidence e ON s.id = e.source_id
         LEFT JOIN claim_evidence ce ON e.id = ce.evidence_id
         GROUP BY p.id, p.name, p.affiliation, p.role, p.url, p.created_at
         ORDER BY claim_count DESC`
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
