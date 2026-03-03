import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const confidence = params.get('confidence');
    const claimType = params.get('type');
    const topicId = params.get('topic');
    const themeId = params.get('theme');
    const tag = params.get('tag');
    const search = params.get('search');
    const sourceId = params.get('source_id');
    const parentId = params.get('parent_id');
    const sort = params.get('sort') || 'score';
    const order = (params.get('order') || 'desc').toUpperCase();
    const limit = Math.min(Math.max(parseInt(params.get('limit') || '50', 10), 1), 200);
    const offset = Math.max(parseInt(params.get('offset') || '0', 10), 0);

    if (!['ASC', 'DESC'].includes(order)) {
      return NextResponse.json({ error: 'order must be asc or desc' }, { status: 400 });
    }

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    // Parent/child filtering
    if (parentId) {
      // Fetch children of a specific parent
      conditions.push('c.parent_claim_id = ?');
      values.push(parseInt(parentId, 10));
    } else if (!search && !confidence && !claimType && !topicId && !themeId && !tag && !sourceId) {
      // Default: only show top-level claims (no parent)
      conditions.push('c.parent_claim_id IS NULL');
    }
    // When filters/search are active, show all matching claims (parent and child)

    // Confidence filter
    if (confidence) {
      conditions.push('scs.computed_confidence = ?');
      values.push(confidence);
    }

    // Claim type filter
    if (claimType) {
      conditions.push('c.claim_type = ?');
      values.push(claimType);
    }

    // Topic filter via EXISTS subquery (supports comma-separated IDs)
    if (topicId) {
      const ids = topicId.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n));
      if (ids.length === 1) {
        conditions.push('EXISTS (SELECT 1 FROM claim_topics ct_f WHERE ct_f.claim_id = c.id AND ct_f.topic_id = ?)');
        values.push(ids[0]);
      } else if (ids.length > 1) {
        conditions.push(`EXISTS (SELECT 1 FROM claim_topics ct_f WHERE ct_f.claim_id = c.id AND ct_f.topic_id IN (${ids.map(() => '?').join(',')}))`);
        values.push(...ids);
      }
    }

    // Theme filter via EXISTS subquery
    if (themeId) {
      conditions.push('EXISTS (SELECT 1 FROM claim_themes cm_f WHERE cm_f.claim_id = c.id AND cm_f.theme_id = ?)');
      values.push(parseInt(themeId, 10));
    }

    // Tag filter via EXISTS subquery
    if (tag) {
      conditions.push('EXISTS (SELECT 1 FROM claim_tags ctg_f WHERE ctg_f.claim_id = c.id AND ctg_f.tag = ?)');
      values.push(tag);
    }

    // Source filter via claim_sources
    if (sourceId) {
      conditions.push('EXISTS (SELECT 1 FROM claim_sources cs_f WHERE cs_f.claim_id = c.id AND cs_f.source_id = ?)');
      values.push(parseInt(sourceId, 10));
    }

    // Fulltext search
    if (search) {
      conditions.push('MATCH(c.statement) AGAINST(? IN BOOLEAN MODE)');
      values.push(search);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    // Sort mapping
    let orderByClause: string;
    switch (sort) {
      case 'newest':
        orderByClause = `c.created_at ${order}`;
        break;
      case 'sources':
        orderByClause = `COALESCE(scs.supporting_sources, 0) ${order}`;
        break;
      case 'alpha':
        orderByClause = `c.statement ${order}`;
        break;
      case 'score':
      default:
        orderByClause = `COALESCE(scs.score, 0) ${order}`;
        break;
    }

    // Count query
    const countSql = `
      SELECT COUNT(*) AS total
      FROM claims c
      LEFT JOIN v_standalone_claim_scores scs ON c.id = scs.claim_id
      ${whereClause}
    `;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, values);
    const total = countRows[0].total as number;

    // Main query
    const dataSql = `
      SELECT
        c.id,
        c.statement,
        c.claim_type,
        c.parent_claim_id,
        c.created_at,
        scs.computed_confidence,
        scs.score,
        COALESCE(scs.supporting_sources, 0) AS supporting_sources,
        COALESCE(scs.contradicting_sources, 0) AS contradicting_sources,
        COALESCE(scs.supporting_evidence, 0) AS supporting_evidence,
        COALESCE(scs.contradicting_evidence, 0) AS contradicting_evidence,
        COALESCE(scs.qualifying_evidence, 0) AS qualifying_evidence,
        (
          SELECT GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR '||')
          FROM claim_topics ct_s
          JOIN topics t ON ct_s.topic_id = t.id
          WHERE ct_s.claim_id = c.id
        ) AS topic_names,
        (
          SELECT GROUP_CONCAT(th.name ORDER BY th.name SEPARATOR '||')
          FROM claim_themes cm_s
          JOIN themes th ON cm_s.theme_id = th.id
          WHERE cm_s.claim_id = c.id
        ) AS theme_names,
        (
          SELECT GROUP_CONCAT(ctg.tag ORDER BY ctg.tag SEPARATOR '||')
          FROM claim_tags ctg
          WHERE ctg.claim_id = c.id
        ) AS tags,
        (SELECT COUNT(*) FROM device_claims dc WHERE dc.claim_id = c.id) AS device_count,
        (SELECT COUNT(*) FROM context_claims cc WHERE cc.claim_id = c.id) AS context_count,
        (SELECT COUNT(*) FROM method_claims mc WHERE mc.claim_id = c.id) AS method_count,
        (SELECT COUNT(*) FROM reasoning_claims rc WHERE rc.claim_id = c.id) AS reasoning_count,
        (SELECT COUNT(*) FROM claims ch WHERE ch.parent_claim_id = c.id) AS child_count
      FROM claims c
      LEFT JOIN v_standalone_claim_scores scs ON c.id = scs.claim_id
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ? OFFSET ?
    `;
    const dataValues = [...values, limit, offset];
    const [rows] = await pool.query<RowDataPacket[]>(dataSql, dataValues);

    const claims = rows.map((row) => ({
      id: row.id,
      statement: row.statement,
      claim_type: row.claim_type,
      parent_claim_id: row.parent_claim_id ?? null,
      created_at: row.created_at,
      computed_confidence: row.computed_confidence ?? 'unsupported',
      score: row.score ?? 0,
      supporting_sources: row.supporting_sources,
      contradicting_sources: row.contradicting_sources,
      supporting_evidence: row.supporting_evidence,
      contradicting_evidence: row.contradicting_evidence,
      qualifying_evidence: row.qualifying_evidence,
      topics: row.topic_names ? row.topic_names.split('||') : [],
      themes: row.theme_names ? row.theme_names.split('||') : [],
      tags: row.tags ? row.tags.split('||') : [],
      device_count: Number(row.device_count),
      context_count: Number(row.context_count),
      method_count: Number(row.method_count),
      reasoning_count: Number(row.reasoning_count),
      child_count: Number(row.child_count),
    }));

    return NextResponse.json({
      data: claims,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/claims error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
