import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('a.title LIKE ?');
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const conn = await pool.getConnection();

    try {
      const [countRows] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM artifacts a ${whereClause}`,
        params
      );
      const total = Number(countRows[0].total);

      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT
           a.id,
           a.title,
           a.word_count,
           a.source_strategy,
           a.status,
           a.created_at
         FROM artifacts a
         ${whereClause}
         ORDER BY a.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return NextResponse.json({
        artifacts: rows,
        total,
        limit,
        offset,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Artifacts list API error:', error);
    return NextResponse.json(
      { error: 'Failed to load artifacts' },
      { status: 500 }
    );
  }
}
