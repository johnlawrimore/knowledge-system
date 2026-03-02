import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const conn = await pool.getConnection();

    try {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT tag, COUNT(*) AS claim_count
         FROM claim_tags
         GROUP BY tag
         ORDER BY tag ASC`
      );

      return NextResponse.json({ tags: rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Tags list API error:', error);
    return NextResponse.json(
      { error: 'Failed to load tags' },
      { status: 500 }
    );
  }
}
