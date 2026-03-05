import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query<RowDataPacket[]>(`
      SELECT cf.id, cf.name, cf.description, cf.is_active, cf.created_at, cf.updated_at,
        COALESCE(MAX(cfv.version), 0) AS current_version,
        COUNT(DISTINCT s.id) AS sources_applied
      FROM curation_rules cf
      LEFT JOIN curation_rule_versions cfv ON cfv.filter_id = cf.id
      LEFT JOIN sources s ON s.curation_rule_version_id = cfv.id
      GROUP BY cf.id, cf.name, cf.description, cf.is_active, cf.created_at, cf.updated_at
      ORDER BY cf.name
    `);
    return NextResponse.json({ filters: rows });
  } finally {
    conn.release();
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, content_filter, preferred_terminology } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!content_filter || typeof content_filter !== 'string' || content_filter.trim().length === 0) {
    return NextResponse.json({ error: 'Content filter is required' }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [filterResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO curation_rules (name, description) VALUES (?, ?)`,
      [name.trim(), description?.trim() || null]
    );
    const filterId = filterResult.insertId;

    const [versionResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO curation_rule_versions (filter_id, version, content_filter, preferred_terminology) VALUES (?, 1, ?, ?)`,
      [filterId, content_filter.trim(), preferred_terminology?.trim() || null]
    );

    await conn.commit();

    return NextResponse.json(
      { id: filterId, name: name.trim(), version_id: versionResult.insertId },
      { status: 201 }
    );
  } catch (error) {
    await conn.rollback();
    console.error('Filter POST error:', error);
    return NextResponse.json({ error: 'Failed to create filter' }, { status: 500 });
  } finally {
    conn.release();
  }
}
