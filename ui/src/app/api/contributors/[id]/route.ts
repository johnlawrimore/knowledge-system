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
           p.id, p.name, p.sort_name, p.affiliation, p.role, p.bio, p.avatar, p.website, p.created_at, p.evaluation_results
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
           s.published_date, s.status,
           sc.role AS contributor_role,
           pub.name AS publication,
           (SELECT c.name FROM source_contributors sc2
            JOIN contributors c ON c.id = sc2.contributor_id
            WHERE sc2.source_id = s.id LIMIT 1) AS main_contributor
         FROM source_contributors sc
         JOIN sources s ON sc.source_id = s.id
         LEFT JOIN publications pub ON s.publication_id = pub.id
         WHERE sc.contributor_id = ?
         ORDER BY s.date_collected DESC`,
        [contributorId]
      );

      // Expert positions from v_expert_positions with is_key flag
      const [positions] = await conn.query<RowDataPacket[]>(
        `SELECT
           vep.claim_id, vep.statement,
           vep.stance, vep.strength, vep.evidence_content, vep.source_title,
           COALESCE(
             (SELECT MAX(cs_k.is_key) FROM claim_sources cs_k
              JOIN source_contributors sc_k ON cs_k.source_id = sc_k.source_id
              WHERE cs_k.claim_id = vep.claim_id AND sc_k.contributor_id = ?),
             FALSE
           ) AS is_key
         FROM v_expert_positions vep
         WHERE vep.contributor_id = ?
         ORDER BY vep.claim_id`,
        [contributorId, contributorId]
      );

      // Contribution stats from v_contributor_scores
      const [scoreRows] = await conn.query<RowDataPacket[]>(
        `SELECT source_count, evidence_count, claim_count,
                supporting_count, contradicting_count, qualifying_count
         FROM v_contributor_scores WHERE contributor_id = ?`,
        [contributorId]
      );

      const contributions = scoreRows.length > 0 ? scoreRows[0] : null;

      // Parse evaluation_results for profile scores
      const evalResults = contributor.evaluation_results
        ? (typeof contributor.evaluation_results === 'string'
            ? JSON.parse(contributor.evaluation_results)
            : contributor.evaluation_results)
        : null;

      return NextResponse.json({
        ...contributor,
        tier: evalResults?.tier ?? null,
        expertise: evalResults?.expertise ?? null,
        authority: evalResults?.authority ?? null,
        reach: evalResults?.reach ?? null,
        reputation: evalResults?.reputation ?? null,
        score_notes: evalResults?.evaluation_notes ?? null,
        evaluated_at: evalResults?.evaluated_at ?? null,
        contributions,
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

    if (body.website !== undefined) {
      const website = typeof body.website === 'string' ? body.website.replace(/\/+$/, '') : body.website;
      updates.push('website = ?');
      values.push(website);
    }

    if (body.sort_name !== undefined) {
      updates.push('sort_name = ?');
      values.push(body.sort_name);
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
