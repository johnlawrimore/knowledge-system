import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const filterId = Number(id);

  if (isNaN(filterId)) {
    return NextResponse.json({ error: 'Invalid filter ID' }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT cf.id, cf.name, cf.description, cf.is_active, cf.created_at, cf.updated_at,
         cfv.id AS version_id, cfv.version, cfv.content_filter, cfv.preferred_terminology, cfv.created_at AS version_created_at
       FROM curation_rules cf
       LEFT JOIN curation_rule_versions cfv ON cfv.filter_id = cf.id
       WHERE cf.id = ?
       ORDER BY cfv.version DESC`,
      [filterId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
    }

    const filter = {
      id: rows[0].id,
      name: rows[0].name,
      description: rows[0].description,
      is_active: rows[0].is_active,
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at,
      versions: rows
        .filter((r) => r.version_id != null)
        .map((r) => ({
          version_id: r.version_id,
          version: r.version,
          content_filter: r.content_filter,
          preferred_terminology: r.preferred_terminology,
          version_created_at: r.version_created_at,
        })),
    };

    return NextResponse.json(filter);
  } finally {
    conn.release();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const filterId = Number(id);

  if (isNaN(filterId)) {
    return NextResponse.json({ error: 'Invalid filter ID' }, { status: 400 });
  }

  const body = await request.json();
  const { name, description, is_active, content_filter, preferred_terminology } = body;

  const conn = await pool.getConnection();
  try {
    // Verify filter exists
    const [existing] = await conn.query<RowDataPacket[]>(
      `SELECT id FROM curation_rules WHERE id = ?`,
      [filterId]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
    }

    await conn.beginTransaction();

    // Update name / description / is_active in place
    const fields: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name.trim());
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description?.trim() || null);
    }
    if (is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }

    if (fields.length > 0) {
      values.push(filterId);
      await conn.query<ResultSetHeader>(
        `UPDATE curation_rules SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    // If content_filter or preferred_terminology changed, create a new version
    if ((content_filter !== undefined && typeof content_filter === 'string' && content_filter.trim().length > 0) || preferred_terminology !== undefined) {
      const [maxRow] = await conn.query<RowDataPacket[]>(
        `SELECT COALESCE(MAX(version), 0) AS max_version FROM curation_rule_versions WHERE filter_id = ?`,
        [filterId]
      );
      const nextVersion = (maxRow[0].max_version as number) + 1;
      // Get previous version values as defaults
      const [prevRow] = await conn.query<RowDataPacket[]>(
        `SELECT content_filter, preferred_terminology FROM curation_rule_versions WHERE filter_id = ? ORDER BY version DESC LIMIT 1`,
        [filterId]
      );
      const prev = prevRow[0] || {};
      await conn.query<ResultSetHeader>(
        `INSERT INTO curation_rule_versions (filter_id, version, content_filter, preferred_terminology) VALUES (?, ?, ?, ?)`,
        [
          filterId,
          nextVersion,
          content_filter !== undefined ? content_filter.trim() : prev.content_filter,
          preferred_terminology !== undefined ? (preferred_terminology?.trim() || null) : prev.preferred_terminology,
        ]
      );
    }

    await conn.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    await conn.rollback();
    console.error('Filter PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update filter' }, { status: 500 });
  } finally {
    conn.release();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const filterId = Number(id);

  if (isNaN(filterId)) {
    return NextResponse.json({ error: 'Invalid filter ID' }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    // Check how many sources reference this filter's versions
    const [usageRows] = await conn.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT s.id) AS source_count
       FROM sources s
       JOIN curation_rule_versions cfv ON s.curation_rule_version_id = cfv.id
       WHERE cfv.filter_id = ?`,
      [filterId]
    );

    const sourceCount = usageRows[0].source_count as number;
    if (sourceCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete — used by ${sourceCount} source${sourceCount === 1 ? '' : 's'}`, source_count: sourceCount },
        { status: 409 }
      );
    }

    const [result] = await conn.query<ResultSetHeader>(
      `DELETE FROM curation_rules WHERE id = ?`,
      [filterId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } finally {
    conn.release();
  }
}
