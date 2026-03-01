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
         c.id, c.statement, c.claim_type, c.reviewer_notes, c.notes,
         c.cluster_id, c.created_at, c.updated_at
       FROM claims c
       WHERE c.id = ?`,
      [id],
    );
    if (claimRows.length === 0) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }
    const claim = claimRows[0];

    // ---- Score data ----
    // If the claim belongs to a cluster, use v_cluster_scores; otherwise v_standalone_claim_scores
    let scoreData: Record<string, unknown> | null = null;
    if (claim.cluster_id) {
      const [csRows] = await pool.query<RowDataPacket[]>(
        `SELECT
           cluster_id, computed_confidence, score,
           supporting_sources, contradicting_sources,
           total_supporting_evidence AS supporting_evidence,
           total_contradicting_evidence AS contradicting_evidence
         FROM v_cluster_scores
         WHERE cluster_id = ?`,
        [claim.cluster_id],
      );
      scoreData = csRows.length > 0 ? csRows[0] : null;
    } else {
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
         ce.strength,
         ce.reasoning,
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
       ORDER BY ce.stance, ce.strength DESC`,
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
         rc.statement AS related_claim_statement
       FROM claim_relationships cr
       JOIN claims rc ON rc.id = CASE
         WHEN cr.claim_id_a = ? THEN cr.claim_id_b
         ELSE cr.claim_id_a
       END
       WHERE cr.claim_id_a = ? OR cr.claim_id_b = ?
       ORDER BY cr.relationship`,
      [id, id, id, id, id],
    );

    // ---- Cluster info ----
    let cluster: Record<string, unknown> | null = null;
    if (claim.cluster_id) {
      const [clusterRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, summary, reviewer_notes
         FROM claim_clusters
         WHERE id = ?`,
        [claim.cluster_id],
      );
      let siblingClaims: RowDataPacket[] = [];
      if (clusterRows.length > 0) {
        const [siblingRows] = await pool.query<RowDataPacket[]>(
          `SELECT id, statement, claim_type
           FROM claims
           WHERE cluster_id = ? AND id != ?
           ORDER BY id`,
          [claim.cluster_id, id],
        );
        siblingClaims = siblingRows;
      }
      cluster = clusterRows.length > 0
        ? { ...clusterRows[0], sibling_claims: siblingClaims }
        : null;
    }

    // Parse evaluation_results JSON strings in evidence
    const evidence = evidenceRows.map((row) => ({
      id: row.evidence_id,
      content: row.content,
      evidence_type: row.evidence_type,
      verbatim_quote: row.verbatim_quote,
      evaluation_results: typeof row.evaluation_results === 'string'
        ? JSON.parse(row.evaluation_results)
        : row.evaluation_results,
      stance: row.stance,
      strength: row.strength,
      reasoning: row.reasoning,
      source_id: row.source_id,
      source_title: row.source_title,
      source_type: row.source_type,
      contributors: row.contributors,
    }));

    return NextResponse.json({
      id: claim.id,
      statement: claim.statement,
      claim_type: claim.claim_type,
      reviewer_notes: claim.reviewer_notes,
      notes: claim.notes,
      cluster_id: claim.cluster_id,
      created_at: claim.created_at,
      updated_at: claim.updated_at,
      score: scoreData ? {
        computed_confidence: scoreData.computed_confidence,
        score: scoreData.score,
        supporting_sources: scoreData.supporting_sources,
        contradicting_sources: scoreData.contradicting_sources,
        supporting_evidence: scoreData.supporting_evidence,
        contradicting_evidence: scoreData.contradicting_evidence,
        qualifying_evidence: scoreData.qualifying_evidence ?? null,
      } : null,
      evidence,
      topics: topicRows,
      themes: themeRows,
      tags: tagRows.map((r) => r.tag),
      relationships: relRows.map((r) => ({
        relationship_id: r.relationship_id,
        relationship: r.relationship,
        direction: r.direction,
        notes: r.notes,
        related_claim_id: r.related_claim_id,
        related_claim_statement: r.related_claim_statement,
      })),
      cluster,
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
