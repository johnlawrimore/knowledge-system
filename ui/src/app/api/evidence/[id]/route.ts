import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const evidenceId = Number(id);
    if (isNaN(evidenceId)) {
      return NextResponse.json({ error: 'Invalid evidence ID' }, { status: 400 });
    }

    const conn = await pool.getConnection();

    try {
      // Evidence detail with source info
      const [evidenceRows] = await conn.query<RowDataPacket[]>(
        `SELECT
           e.id, e.content, e.source_id, e.artifact_id,
           e.evidence_type, e.verbatim_quote,
           e.evaluation_results, e.derived_from_evidence_id,
           e.notes, e.created_at,
           s.title AS source_title, s.source_type, s.url AS source_url
         FROM evidence e
         JOIN sources s ON e.source_id = s.id
         WHERE e.id = ?`,
        [evidenceId]
      );

      if (evidenceRows.length === 0) {
        return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
      }

      const evidence = evidenceRows[0];

      // Linked claims via claim_evidence
      const [claims] = await conn.query<RowDataPacket[]>(
        `SELECT
           c.id, c.statement,
           ce.stance, ce.strength, ce.reasoning
         FROM claim_evidence ce
         JOIN claims c ON ce.claim_id = c.id
         WHERE ce.evidence_id = ?
         ORDER BY c.id`,
        [evidenceId]
      );

      // Derived-from chain: walk up derived_from_evidence_id
      const derivedChain: RowDataPacket[] = [];
      let currentDerivedId = evidence.derived_from_evidence_id;

      while (currentDerivedId) {
        const [parentRows] = await conn.query<RowDataPacket[]>(
          `SELECT
             e.id, e.content, e.evidence_type,
             e.derived_from_evidence_id,
             s.title AS source_title
           FROM evidence e
           JOIN sources s ON e.source_id = s.id
           WHERE e.id = ?`,
          [currentDerivedId]
        );

        if (parentRows.length === 0) break;

        derivedChain.push(parentRows[0]);
        currentDerivedId = parentRows[0].derived_from_evidence_id;

        // Safety: prevent infinite loops
        if (derivedChain.length > 20) break;
      }

      return NextResponse.json({
        ...evidence,
        claims,
        derived_chain: derivedChain,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Evidence detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to load evidence' },
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
    const evidenceId = Number(id);
    if (isNaN(evidenceId)) {
      return NextResponse.json({ error: 'Invalid evidence ID' }, { status: 400 });
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

    values.push(evidenceId);

    const conn = await pool.getConnection();

    try {
      const [result] = await conn.query<ResultSetHeader>(
        `UPDATE evidence SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Evidence update API error:', error);
    return NextResponse.json(
      { error: 'Failed to update evidence' },
      { status: 500 }
    );
  }
}
