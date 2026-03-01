import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params;
    const decodedTag = decodeURIComponent(tag);

    const conn = await pool.getConnection();

    try {
      const [claims] = await conn.query<RowDataPacket[]>(
        `SELECT
           sc.claim_id AS id, sc.statement, sc.claim_type,
           sc.computed_confidence, sc.score,
           sc.supporting_sources, sc.contradicting_sources,
           sc.supporting_evidence, sc.contradicting_evidence
         FROM claim_tags ct
         JOIN v_standalone_claim_scores sc ON ct.claim_id = sc.claim_id
         WHERE ct.tag = ?
         ORDER BY sc.score DESC`,
        [decodedTag]
      );

      return NextResponse.json({ tag: decodedTag, claims });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Tag claims API error:', error);
    return NextResponse.json(
      { error: 'Failed to load claims for tag' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params;
    const decodedTag = decodeURIComponent(tag);
    const body = await request.json();

    if (!body.newTag || typeof body.newTag !== 'string' || body.newTag.trim().length === 0) {
      return NextResponse.json({ error: 'newTag is required' }, { status: 400 });
    }

    const newTag = body.newTag.trim();

    const conn = await pool.getConnection();

    try {
      const [result] = await conn.query<ResultSetHeader>(
        `UPDATE claim_tags SET tag = ? WHERE tag = ?`,
        [newTag, decodedTag]
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, oldTag: decodedTag, newTag, updated: result.affectedRows });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Tag rename API error:', error);
    return NextResponse.json(
      { error: 'Failed to rename tag' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params;
    const decodedTag = decodeURIComponent(tag);

    const conn = await pool.getConnection();

    try {
      const [result] = await conn.query<ResultSetHeader>(
        `DELETE FROM claim_tags WHERE tag = ?`,
        [decodedTag]
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, tag: decodedTag, deleted: result.affectedRows });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Tag delete API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
