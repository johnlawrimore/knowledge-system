import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const compositionId = Number(id);
    if (isNaN(compositionId)) {
      return NextResponse.json({ error: 'Invalid composition ID' }, { status: 400 });
    }

    const conn = await pool.getConnection();

    try {
      // Composition detail
      const [compositionRows] = await conn.query<RowDataPacket[]>(
        `SELECT
           a.id, a.title, a.content, a.word_count,
           a.evaluation_results,
           a.status, a.created_at, a.updated_at
         FROM compositions a
         WHERE a.id = ?`,
        [compositionId]
      );

      if (compositionRows.length === 0) {
        return NextResponse.json({ error: 'Composition not found' }, { status: 404 });
      }

      const composition = compositionRows[0];

      // Linked sources via composition_sources
      const [sources] = await conn.query<RowDataPacket[]>(
        `SELECT
           s.id, s.title, s.source_type, s.url,
           s.published_date, s.word_count, s.status,
           cs.contribution_note,
           pub.name AS publication,
           (SELECT c.name FROM source_contributors sc2
            JOIN contributors c ON c.id = sc2.contributor_id
            WHERE sc2.source_id = s.id LIMIT 1) AS main_contributor
         FROM composition_sources cs
         JOIN sources s ON cs.source_id = s.id
         LEFT JOIN publications pub ON s.publication_id = pub.id
         WHERE cs.composition_id = ?
         ORDER BY s.title`,
        [compositionId]
      );

      // Claim count: claims linked via evidence from this composition's sources
      const [claimCountRows] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT ce.claim_id) AS claim_count
         FROM composition_sources cs
         JOIN evidence e ON cs.source_id = e.source_id
         JOIN claim_evidence ce ON e.id = ce.evidence_id
         WHERE cs.composition_id = ?`,
        [compositionId]
      );

      return NextResponse.json({
        ...composition,
        sources,
        claim_count: Number(claimCountRows[0].claim_count),
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Composition detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to load composition' },
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
    const compositionId = Number(id);
    if (isNaN(compositionId)) {
      return NextResponse.json({ error: 'Invalid composition ID' }, { status: 400 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: (string | number)[] = [];

    const allowedFields = ['title', 'content', 'status'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (body.content !== undefined) {
      const wordCount = body.content.trim().split(/\s+/).filter(Boolean).length;
      updates.push('word_count = ?');
      values.push(wordCount);
    }

    if (body.evaluation_results !== undefined) {
      updates.push('evaluation_results = ?');
      values.push(JSON.stringify(body.evaluation_results));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(compositionId);

    const conn = await pool.getConnection();

    try {
      const [result] = await conn.query<ResultSetHeader>(
        `UPDATE compositions SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Composition not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Composition update API error:', error);
    return NextResponse.json(
      { error: 'Failed to update composition' },
      { status: 500 }
    );
  }
}
