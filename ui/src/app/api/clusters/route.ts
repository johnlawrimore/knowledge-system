import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const conn = await pool.getConnection();

    try {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT
           cluster_id AS id,
           summary,
           reviewer_notes,
           claim_count,
           computed_confidence,
           score,
           supporting_sources,
           contradicting_sources
         FROM v_cluster_scores
         ORDER BY score DESC`
      );

      return NextResponse.json({ clusters: rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Clusters list API error:', error);
    return NextResponse.json(
      { error: 'Failed to load clusters' },
      { status: 500 }
    );
  }
}
