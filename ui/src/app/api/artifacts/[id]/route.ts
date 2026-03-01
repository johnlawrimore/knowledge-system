import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const artifactId = Number(id);
    if (isNaN(artifactId)) {
      return NextResponse.json({ error: 'Invalid artifact ID' }, { status: 400 });
    }

    const conn = await pool.getConnection();

    try {
      // Artifact detail
      const [artifactRows] = await conn.query<RowDataPacket[]>(
        `SELECT
           a.id, a.title, a.content_md, a.word_count,
           a.source_strategy, a.evaluation_results,
           a.status, a.notes, a.created_at, a.updated_at
         FROM artifacts a
         WHERE a.id = ?`,
        [artifactId]
      );

      if (artifactRows.length === 0) {
        return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
      }

      const artifact = artifactRows[0];

      // Linked sources via artifact_sources
      const [sources] = await conn.query<RowDataPacket[]>(
        `SELECT
           s.id, s.title, s.source_type, s.url,
           s.publication_date, s.word_count, s.status,
           ars.contribution_note
         FROM artifact_sources ars
         JOIN sources s ON ars.source_id = s.id
         WHERE ars.artifact_id = ?
         ORDER BY s.title`,
        [artifactId]
      );

      // Claim count: claims linked via evidence from this artifact's sources
      const [claimCountRows] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT ce.claim_id) AS claim_count
         FROM artifact_sources ars
         JOIN evidence e ON ars.source_id = e.source_id
         JOIN claim_evidence ce ON e.id = ce.evidence_id
         WHERE ars.artifact_id = ?`,
        [artifactId]
      );

      return NextResponse.json({
        ...artifact,
        sources,
        claim_count: Number(claimCountRows[0].claim_count),
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Artifact detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to load artifact' },
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
    const artifactId = Number(id);
    if (isNaN(artifactId)) {
      return NextResponse.json({ error: 'Invalid artifact ID' }, { status: 400 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.notes !== undefined) {
      updates.push('notes = ?');
      values.push(body.notes);
    }

    if (body.evaluation_results !== undefined) {
      updates.push('evaluation_results = ?');
      values.push(JSON.stringify(body.evaluation_results));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(artifactId);

    const conn = await pool.getConnection();

    try {
      const [result] = await conn.query<ResultSetHeader>(
        `UPDATE artifacts SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Artifact update API error:', error);
    return NextResponse.json(
      { error: 'Failed to update artifact' },
      { status: 500 }
    );
  }
}
