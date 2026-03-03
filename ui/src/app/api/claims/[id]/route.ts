import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: idParam } = await context.params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid claim id' }, { status: 400 });
    }

    // ---- Claim base fields ----
    const [claimRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         c.id, c.statement, c.claim_type, c.parent_claim_id,
         c.reviewer_notes, c.notes,
         c.evaluation_results, c.created_at, c.updated_at
       FROM claims c
       WHERE c.id = ?`,
      [id],
    );
    if (claimRows.length === 0) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }
    const claim = claimRows[0];

    // ---- Score data ----
    let scoreData: Record<string, unknown> | null = null;
    {
      const [ssRows] = await pool.query<RowDataPacket[]>(
        `SELECT
           claim_id, computed_confidence, score,
           supporting_sources, contradicting_sources,
           supporting_evidence, contradicting_evidence, qualifying_evidence
         FROM v_standalone_claim_scores
         WHERE claim_id = ?`,
        [id],
      );
      scoreData = ssRows.length > 0 ? ssRows[0] : null;
    }

    // ---- Evidence with full details ----
    const [evidenceRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         e.id AS evidence_id,
         e.content,
         e.evidence_type,
         e.verbatim_quote,
         e.evaluation_results,
         ce.stance,
         ce.evaluation_results AS ce_eval,
         s.id AS source_id,
         s.title AS source_title,
         s.source_type,
         (
           SELECT GROUP_CONCAT(con.name ORDER BY con.name SEPARATOR ', ')
           FROM source_contributors sc
           JOIN contributors con ON sc.contributor_id = con.id
           WHERE sc.source_id = s.id
         ) AS contributors
       FROM claim_evidence ce
       JOIN evidence e ON ce.evidence_id = e.id
       JOIN sources s ON e.source_id = s.id
       WHERE ce.claim_id = ?
       ORDER BY ce.stance, JSON_EXTRACT(ce.evaluation_results, '$.strength') ASC`,
      [id],
    );

    // ---- Topics ----
    const [topicRows] = await pool.query<RowDataPacket[]>(
      `SELECT t.id, t.name, t.description
       FROM claim_topics ct
       JOIN topics t ON ct.topic_id = t.id
       WHERE ct.claim_id = ?
       ORDER BY t.name`,
      [id],
    );

    // ---- Themes ----
    const [themeRows] = await pool.query<RowDataPacket[]>(
      `SELECT th.id, th.name, th.thesis
       FROM claim_themes cm
       JOIN themes th ON cm.theme_id = th.id
       WHERE cm.claim_id = ?
       ORDER BY th.name`,
      [id],
    );

    // ---- Tags ----
    const [tagRows] = await pool.query<RowDataPacket[]>(
      `SELECT tag FROM claim_tags WHERE claim_id = ? ORDER BY tag`,
      [id],
    );

    // ---- Sources (via claim_sources) ----
    const [sourceRows] = await pool.query<RowDataPacket[]>(
      `SELECT s.id, s.title, s.source_type
       FROM claim_sources cs
       JOIN sources s ON cs.source_id = s.id
       WHERE cs.claim_id = ?
       ORDER BY s.title`,
      [id],
    );

    // ---- Devices ----
    const [deviceRows] = await pool.query<RowDataPacket[]>(
      `SELECT d.id, d.content, d.device_type, d.effectiveness_note,
              s.id AS source_id, s.title AS source_title
       FROM claim_devices dc
       JOIN devices d ON dc.device_id = d.id
       JOIN sources s ON d.source_id = s.id
       WHERE dc.claim_id = ?
       ORDER BY d.id`,
      [id],
    );

    // ---- Contexts ----
    const [contextRows] = await pool.query<RowDataPacket[]>(
      `SELECT ctx.id, ctx.content, ctx.context_type,
              s.id AS source_id, s.title AS source_title
       FROM claim_contexts cc
       JOIN contexts ctx ON cc.context_id = ctx.id
       JOIN sources s ON ctx.source_id = s.id
       WHERE cc.claim_id = ?
       ORDER BY ctx.id`,
      [id],
    );

    // ---- Methods ----
    const [methodRows] = await pool.query<RowDataPacket[]>(
      `SELECT m.id, m.content, m.method_type,
              s.id AS source_id, s.title AS source_title
       FROM claim_methods mc
       JOIN methods m ON mc.method_id = m.id
       JOIN sources s ON m.source_id = s.id
       WHERE mc.claim_id = ?
       ORDER BY m.id`,
      [id],
    );

    // ---- Reasonings (nested under evidence) ----
    const [reasoningRows] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, r.content, r.reasoning_type,
              r.evidence_id, r.claim_id,
              s.id AS source_id, s.title AS source_title
       FROM reasonings r
       JOIN sources s ON r.source_id = s.id
       WHERE r.claim_id = ?
       ORDER BY r.evidence_id, r.id`,
      [id],
    );

    // ---- Parent claim ----
    let parentClaim = null;
    if (claim.parent_claim_id) {
      const [parentRows] = await pool.query<RowDataPacket[]>(
        `SELECT c.id, c.statement, c.claim_type,
                scs.computed_confidence, scs.score
         FROM claims c
         LEFT JOIN v_standalone_claim_scores scs ON c.id = scs.claim_id
         WHERE c.id = ?`,
        [claim.parent_claim_id],
      );
      if (parentRows.length > 0) {
        parentClaim = {
          id: parentRows[0].id,
          statement: parentRows[0].statement,
          claim_type: parentRows[0].claim_type,
          computed_confidence: parentRows[0].computed_confidence ?? 'unsupported',
          score: parentRows[0].score ?? 0,
        };
      }
    }

    // ---- Child claims ----
    const [childRows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id, c.statement, c.claim_type,
              scs.computed_confidence, scs.score
       FROM claims c
       LEFT JOIN v_standalone_claim_scores scs ON c.id = scs.claim_id
       WHERE c.parent_claim_id = ?
       ORDER BY COALESCE(scs.score, 0) DESC`,
      [id],
    );

    // ---- Relationships (both directions) ----
    const [relRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         cr.id AS relationship_id,
         cr.relationship,
         cr.notes,
         cr.claim_id_a,
         cr.claim_id_b,
         CASE
           WHEN cr.claim_id_a = ? THEN cr.claim_id_b
           ELSE cr.claim_id_a
         END AS related_claim_id,
         CASE
           WHEN cr.claim_id_a = ? THEN 'outgoing'
           ELSE 'incoming'
         END AS direction,
         rc.statement AS related_claim_statement,
         rc.claim_type AS related_claim_type,
         scs.computed_confidence AS related_confidence,
         scs.score AS related_score
       FROM claim_relationships cr
       JOIN claims rc ON rc.id = CASE
         WHEN cr.claim_id_a = ? THEN cr.claim_id_b
         ELSE cr.claim_id_a
       END
       LEFT JOIN v_standalone_claim_scores scs ON scs.claim_id = rc.id
       WHERE cr.claim_id_a = ? OR cr.claim_id_b = ?
       ORDER BY cr.relationship`,
      [id, id, id, id, id],
    );

    const evidence = evidenceRows.map((row) => {
      const evalResults = typeof row.evaluation_results === 'string'
        ? JSON.parse(row.evaluation_results)
        : row.evaluation_results;
      const ceEval = typeof row.ce_eval === 'string'
        ? JSON.parse(row.ce_eval)
        : row.ce_eval;
      return {
        id: row.evidence_id,
        content: row.content,
        evidence_type: row.evidence_type,
        verbatim_quote: row.verbatim_quote,
        stance: row.stance,
        strength: ceEval?.strength ?? null,
        strength_notes: ceEval?.notes ?? null,
        source_id: row.source_id,
        source_title: row.source_title,
        source_type: row.source_type,
        credibility: evalResults?.credibility ?? null,
        contributors: row.contributors,
      };
    });

    // Parse claim evaluation_results
    let claimEvalResults = null;
    if (claim.evaluation_results) {
      try {
        claimEvalResults = typeof claim.evaluation_results === 'string'
          ? JSON.parse(claim.evaluation_results)
          : claim.evaluation_results;
      } catch {
        claimEvalResults = claim.evaluation_results;
      }
    }

    return NextResponse.json({
      id: claim.id,
      statement: claim.statement,
      claim_type: claim.claim_type,
      parent_claim_id: claim.parent_claim_id ?? null,
      parent_claim: parentClaim,
      children: childRows.map((r) => ({
        id: r.id,
        statement: r.statement,
        claim_type: r.claim_type,
        computed_confidence: r.computed_confidence ?? 'unsupported',
        score: r.score ?? 0,
      })),
      reviewer_notes: claim.reviewer_notes,
      notes: claim.notes,
      evaluation_results: claimEvalResults,
      created_at: claim.created_at,
      updated_at: claim.updated_at,
      computed_confidence: scoreData?.computed_confidence ?? 'unsupported',
      score: scoreData?.score ?? 0,
      supporting_sources: scoreData?.supporting_sources ?? 0,
      contradicting_sources: scoreData?.contradicting_sources ?? 0,
      supporting_evidence: scoreData?.supporting_evidence ?? 0,
      contradicting_evidence: scoreData?.contradicting_evidence ?? 0,
      qualifying_evidence: scoreData?.qualifying_evidence ?? 0,
      evidence,
      sources: sourceRows,
      devices: deviceRows,
      contexts: contextRows,
      methods: methodRows,
      reasonings: reasoningRows,
      topics: topicRows,
      themes: themeRows,
      tags: tagRows.map((r) => r.tag),
      relationships: relRows.map((r) => ({
        id: r.relationship_id,
        relationship: r.relationship,
        direction: r.direction,
        notes: r.notes,
        related_claim_id: r.related_claim_id,
        related_statement: r.related_claim_statement,
        related_claim_type: r.related_claim_type ?? 'assertion',
        related_confidence: r.related_confidence ?? null,
        related_score: r.related_score ?? null,
      })),
    });
  } catch (error) {
    console.error('GET /api/claims/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: idParam } = await context.params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid claim id' }, { status: 400 });
    }

    const body = await request.json();
    const allowedFields = ['statement', 'reviewer_notes', 'notes'];
    const updates: string[] = [];
    const values: (string | null)[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update. Allowed: statement, reviewer_notes, notes' },
        { status: 400 },
      );
    }

    values.push(String(id));
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE claims SET ${updates.join(', ')} WHERE id = ?`,
      values,
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('PATCH /api/claims/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
