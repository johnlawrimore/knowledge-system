import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'date';
    const order = searchParams.get('order') || 'desc';
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (status) {
      conditions.push('s.status = ?');
      params.push(status);
    }

    if (type) {
      conditions.push('s.source_type = ?');
      params.push(type);
    }

    if (search) {
      conditions.push('s.title LIKE ?');
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const sortColumnMap: Record<string, string> = {
      date: 's.date_collected',
      words: 's.word_count',
      status: 's.status',
    };
    const sortColumn = sortColumnMap[sort] || 's.date_collected';
    const sortDirection = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conn = await pool.getConnection();

    try {
      // Total count for pagination
      const [countRows] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM sources s ${whereClause}`,
        params
      );
      const total = Number(countRows[0].total);

      // Source list
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT
           s.id,
           s.title,
           s.source_type,
           s.url,
           s.publication_date,
           s.word_count,
           s.status,
           s.date_collected,
           (SELECT c.name FROM source_contributors sc
            JOIN contributors c ON c.id = sc.contributor_id
            WHERE sc.source_id = s.id
            LIMIT 1) AS main_contributor
         FROM sources s
         ${whereClause}
         ORDER BY ${sortColumn} ${sortDirection}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return NextResponse.json({
        sources: rows,
        total,
        limit,
        offset,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Sources list API error:', error);
    return NextResponse.json(
      { error: 'Failed to load sources' },
      { status: 500 }
    );
  }
}
