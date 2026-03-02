import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sourceId = Number(id);

  if (isNaN(sourceId)) {
    return NextResponse.json({ error: 'Invalid source ID' }, { status: 400 });
  }

  try {
    const conn = await pool.getConnection();

    try {
      // Full source record
      const [sourceRows] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM sources WHERE id = ?',
        [sourceId]
      );

      if (sourceRows.length === 0) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }

      const source = sourceRows[0];

      // Split content: preview (first 500 chars) and full content
      const original = source.content_md || '';
      const contentPreview = original.substring(0, 500);
      const hasMore = original.length > 500;

      // Parse evaluation_results from JSON string if present
      let evaluationResults = null;
      if (source.evaluation_results) {
        try {
          evaluationResults = typeof source.evaluation_results === 'string'
            ? JSON.parse(source.evaluation_results)
            : source.evaluation_results;
        } catch {
          evaluationResults = source.evaluation_results;
        }
      }

      // Contributors
      const [contributors] = await conn.query<RowDataPacket[]>(
        `SELECT c.id, c.name, c.role, c.affiliation, c.avatar, sc.role AS contributor_role
         FROM contributors c
         JOIN source_contributors sc ON sc.contributor_id = c.id
         WHERE sc.source_id = ?`,
        [sourceId]
      );

      // Compositions linked to this source
      const [compositions] = await conn.query<RowDataPacket[]>(
        `SELECT c.id, c.title, c.status
         FROM compositions c
         JOIN composition_sources csrc ON csrc.composition_id = c.id
         WHERE csrc.source_id = ?`,
        [sourceId]
      );

      // Evidence counts by stance (stance lives on claim_evidence, not evidence)
      const [evidenceCounts] = await conn.query<RowDataPacket[]>(
        `SELECT ce.stance, COUNT(DISTINCT ce.evidence_id) as count
         FROM evidence e
         JOIN claim_evidence ce ON e.id = ce.evidence_id
         WHERE e.source_id = ?
         GROUP BY ce.stance`,
        [sourceId]
      );

      const evidenceByStance: Record<string, number> = {};
      let evidenceTotal = 0;
      for (const row of evidenceCounts) {
        evidenceByStance[row.stance] = Number(row.count);
        evidenceTotal += Number(row.count);
      }

      // Also count evidence not yet linked to claims
      const [[totalEvidence]] = await conn.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM evidence WHERE source_id = ?',
        [sourceId]
      );
      evidenceTotal = Math.max(evidenceTotal, Number(totalEvidence.count));

      // Claims count via evidence chain
      const [[claimsCount]] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT ce.claim_id) as count
         FROM evidence e
         JOIN claim_evidence ce ON e.id = ce.evidence_id
         WHERE e.source_id = ?`,
        [sourceId]
      );

      return NextResponse.json({
        ...source,
        content_preview: contentPreview,
        original,
        content_has_more: hasMore,
        evaluation_results: evaluationResults,
        contributors,
        compositions: {
          count: compositions.length,
          items: compositions,
        },
        evidence: {
          byStance: evidenceByStance,
          total: evidenceTotal,
        },
        claims_count: Number(claimsCount.count),
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Source detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to load source details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sourceId = Number(id);

  if (isNaN(sourceId)) {
    return NextResponse.json({ error: 'Invalid source ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { notes, evaluation_results, publication } = body;

    if (notes === undefined && evaluation_results === undefined && publication === undefined) {
      return NextResponse.json(
        { error: 'Request must include notes, evaluation_results, and/or publication' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (evaluation_results !== undefined) {
      updates.push('evaluation_results = ?');
      values.push(
        typeof evaluation_results === 'string'
          ? evaluation_results
          : JSON.stringify(evaluation_results)
      );
    }

    if (publication !== undefined) {
      updates.push('publication = ?');
      values.push(publication);
    }

    values.push(String(sourceId));

    const conn = await pool.getConnection();

    try {
      // Verify the source exists
      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM sources WHERE id = ?',
        [sourceId]
      );

      if (existing.length === 0) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }

      const [result] = await conn.query<ResultSetHeader>(
        `UPDATE sources SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'No changes applied' }, { status: 404 });
      }

      // Return the updated source
      const [updatedRows] = await conn.query<RowDataPacket[]>(
        'SELECT id, notes, evaluation_results, publication FROM sources WHERE id = ?',
        [sourceId]
      );

      const updated = updatedRows[0];
      let parsedEval = null;
      if (updated.evaluation_results) {
        try {
          parsedEval = typeof updated.evaluation_results === 'string'
            ? JSON.parse(updated.evaluation_results)
            : updated.evaluation_results;
        } catch {
          parsedEval = updated.evaluation_results;
        }
      }

      return NextResponse.json({
        id: updated.id,
        notes: updated.notes,
        evaluation_results: parsedEval,
        publication: updated.publication,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Source PATCH API error:', error);
    return NextResponse.json(
      { error: 'Failed to update source' },
      { status: 500 }
    );
  }
}
