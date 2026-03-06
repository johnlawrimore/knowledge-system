import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT p.id, p.name, p.type, p.url, p.created_at,
                COUNT(DISTINCT s.id) AS source_count
         FROM publications p
         LEFT JOIN sources s ON s.publication_id = p.id
         GROUP BY p.id, p.name, p.type, p.url, p.created_at
         ORDER BY p.name ASC`
      );
      return NextResponse.json({ publications: rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Publications list API error:', error);
    return NextResponse.json(
      { error: 'Failed to load publications' },
      { status: 500 }
    );
  }
}
