import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contributorId = Number(id);
    if (isNaN(contributorId)) {
      return NextResponse.json({ error: 'Invalid contributor ID' }, { status: 400 });
    }

    const conn = await pool.getConnection();

    try {
      // Contributor detail
      const [contributorRows] = await conn.query<RowDataPacket[]>(
        `SELECT
           p.id, p.name, p.affiliation, p.role, p.bio, p.avatar, p.url, p.notes, p.created_at
         FROM contributors p
         WHERE p.id = ?`,
        [contributorId]
      );

      if (contributorRows.length === 0) {
        return NextResponse.json({ error: 'Contributor not found' }, { status: 404 });
      }

      const contributor = contributorRows[0];

      // Sources via source_contributors
      const [sources] = await conn.query<RowDataPacket[]>(
        `SELECT
           s.id, s.title, s.source_type, s.url,
           s.publication_date, s.status,
           sc.role AS contributor_role
         FROM source_contributors sc
         JOIN sources s ON sc.source_id = s.id
         WHERE sc.contributor_id = ?
         ORDER BY s.date_collected DESC`,
        [contributorId]
      );

      // Expert positions from v_expert_positions
      const [positions] = await conn.query<RowDataPacket[]>(
        `SELECT
           claim_id, statement, cluster_id,
           stance, strength, evidence_content, source_title
         FROM v_expert_positions
         WHERE contributor_id = ?
         ORDER BY claim_id`,
        [contributorId]
      );

      return NextResponse.json({
        ...contributor,
        sources,
        positions,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Contributor detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to load contributor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contributorId = Number(id);
    if (isNaN(contributorId)) {
      return NextResponse.json({ error: 'Invalid contributor ID' }, { status: 400 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.affiliation !== undefined) {
      updates.push('affiliation = ?');
      values.push(body.affiliation);
    }

    if (body.role !== undefined) {
      updates.push('role = ?');
      values.push(body.role);
    }

    if (body.bio !== undefined) {
      updates.push('bio = ?');
      values.push(body.bio);
    }

    if (body.avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(body.avatar);
    }

    if (body.url !== undefined) {
      updates.push('url = ?');
      values.push(body.url);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(contributorId);

    const conn = await pool.getConnection();

    try {
      const [result] = await conn.query<ResultSetHeader>(
        `UPDATE contributors SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Contributor not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Contributor update API error:', error);
    return NextResponse.json(
      { error: 'Failed to update contributor' },
      { status: 500 }
    );
  }
}
