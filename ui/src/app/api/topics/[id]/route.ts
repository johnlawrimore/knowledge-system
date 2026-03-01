import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const topicId = Number(id);
    if (isNaN(topicId)) {
      return NextResponse.json({ error: 'Invalid topic ID' }, { status: 400 });
    }

    const conn = await pool.getConnection();

    try {
      // Topic detail
      const [topicRows] = await conn.query<RowDataPacket[]>(
        `SELECT
           t.id, t.name, t.description, t.parent_topic_id,
           t.sort_order, t.created_at
         FROM topics t
         WHERE t.id = ?`,
        [topicId]
      );

      if (topicRows.length === 0) {
        return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
      }

      const topic = topicRows[0];

      // Claims for this topic with scores
      const [claims] = await conn.query<RowDataPacket[]>(
        `SELECT
           sc.claim_id AS id, sc.statement, sc.claim_type,
           sc.computed_confidence, sc.score,
           sc.supporting_sources, sc.contradicting_sources,
           sc.supporting_evidence, sc.contradicting_evidence
         FROM claim_topics ct
         JOIN v_standalone_claim_scores sc ON ct.claim_id = sc.claim_id
         WHERE ct.topic_id = ?
         ORDER BY sc.score DESC`,
        [topicId]
      );

      // Strongest and weakest claims
      const strongest = claims.slice(0, 5);
      const weakest = [...claims].sort((a, b) => Number(a.score) - Number(b.score)).slice(0, 5);

      return NextResponse.json({
        ...topic,
        claims,
        strongest,
        weakest,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Topic detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to load topic' },
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
    const topicId = Number(id);
    if (isNaN(topicId)) {
      return NextResponse.json({ error: 'Invalid topic ID' }, { status: 400 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }

    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description);
    }

    if (body.parent_topic_id !== undefined) {
      updates.push('parent_topic_id = ?');
      values.push(body.parent_topic_id);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(topicId);

    const conn = await pool.getConnection();

    try {
      const [result] = await conn.query<ResultSetHeader>(
        `UPDATE topics SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Topic update API error:', error);
    return NextResponse.json(
      { error: 'Failed to update topic' },
      { status: 500 }
    );
  }
}
