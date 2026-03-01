import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const themeId = Number(id);
    if (isNaN(themeId)) {
      return NextResponse.json({ error: 'Invalid theme ID' }, { status: 400 });
    }

    const conn = await pool.getConnection();

    try {
      // Theme detail
      const [themeRows] = await conn.query<RowDataPacket[]>(
        `SELECT
           th.id, th.name, th.thesis, th.description, th.created_at
         FROM themes th
         WHERE th.id = ?`,
        [themeId]
      );

      if (themeRows.length === 0) {
        return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
      }

      const theme = themeRows[0];

      // Claims for this theme with scores
      const [claims] = await conn.query<RowDataPacket[]>(
        `SELECT
           sc.claim_id AS id, sc.statement, sc.claim_type,
           sc.computed_confidence, sc.score,
           sc.supporting_sources, sc.contradicting_sources,
           sc.supporting_evidence, sc.contradicting_evidence
         FROM claim_themes cth
         JOIN v_standalone_claim_scores sc ON cth.claim_id = sc.claim_id
         WHERE cth.theme_id = ?
         ORDER BY sc.score DESC`,
        [themeId]
      );

      // Confidence breakdown
      const confidenceBreakdown: Record<string, number> = {
        strong: 0,
        moderate: 0,
        developing: 0,
        contested: 0,
        unsupported: 0,
      };

      for (const claim of claims) {
        const conf = claim.computed_confidence as string;
        if (conf in confidenceBreakdown) {
          confidenceBreakdown[conf]++;
        }
      }

      return NextResponse.json({
        ...theme,
        claims,
        confidence_breakdown: confidenceBreakdown,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Theme detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to load theme' },
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
    const themeId = Number(id);
    if (isNaN(themeId)) {
      return NextResponse.json({ error: 'Invalid theme ID' }, { status: 400 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }

    if (body.thesis !== undefined) {
      updates.push('thesis = ?');
      values.push(body.thesis);
    }

    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(themeId);

    const conn = await pool.getConnection();

    try {
      const [result] = await conn.query<ResultSetHeader>(
        `UPDATE themes SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Theme update API error:', error);
    return NextResponse.json(
      { error: 'Failed to update theme' },
      { status: 500 }
    );
  }
}
