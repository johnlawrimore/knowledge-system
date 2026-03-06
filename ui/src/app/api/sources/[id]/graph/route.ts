import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sourceId = Number(id);

  if (isNaN(sourceId)) {
    return NextResponse.json({ error: 'Invalid source ID' }, { status: 400 });
  }

  const conn = await pool.getConnection();

  try {
    // 1. Claims with topic assignments
    const [claimRows] = await conn.query<RowDataPacket[]>(
      `SELECT scs.claim_id AS id, scs.statement, scs.claim_type, cs.is_key,
              scs.computed_confidence, scs.score,
              GROUP_CONCAT(DISTINCT ct.topic_id) AS topic_ids
       FROM claim_sources cs
       JOIN v_standalone_claim_scores scs ON cs.claim_id = scs.claim_id
       LEFT JOIN claim_topics ct ON cs.claim_id = ct.claim_id
       WHERE cs.source_id = ?
       GROUP BY scs.claim_id, scs.statement, scs.claim_type, cs.is_key,
                scs.computed_confidence, scs.score
       ORDER BY cs.is_key DESC, scs.score DESC`,
      [sourceId]
    );

    // 2. Topics (deduplicated)
    const [topicRows] = await conn.query<RowDataPacket[]>(
      `SELECT DISTINCT t.id, t.name
       FROM claim_sources cs
       JOIN claim_topics ct ON cs.claim_id = ct.claim_id
       JOIN topics t ON ct.topic_id = t.id
       WHERE cs.source_id = ?
       ORDER BY t.name`,
      [sourceId]
    );

    // 3. Evidence per claim (from this source only)
    const [evidenceRows] = await conn.query<RowDataPacket[]>(
      `SELECT ce.claim_id, e.id, LEFT(e.content, 100) AS content, e.evidence_type
       FROM claim_evidence ce
       JOIN evidence e ON ce.evidence_id = e.id
       WHERE e.source_id = ?`,
      [sourceId]
    );

    // 4. Devices per claim (from this source only)
    const [deviceRows] = await conn.query<RowDataPacket[]>(
      `SELECT cd.claim_id, d.id, LEFT(d.content, 100) AS content, d.device_type
       FROM claim_devices cd
       JOIN devices d ON cd.device_id = d.id
       WHERE d.source_id = ?`,
      [sourceId]
    );

    // 5. Contexts per claim (from this source only)
    const [contextRows] = await conn.query<RowDataPacket[]>(
      `SELECT cc.claim_id, c.id, LEFT(c.content, 100) AS content, c.context_type
       FROM claim_contexts cc
       JOIN contexts c ON cc.context_id = c.id
       WHERE c.source_id = ?`,
      [sourceId]
    );

    // 6. Methods per claim (from this source only)
    const [methodRows] = await conn.query<RowDataPacket[]>(
      `SELECT cm.claim_id, m.id, LEFT(m.content, 100) AS content, m.method_type
       FROM claim_methods cm
       JOIN methods m ON cm.method_id = m.id
       WHERE m.source_id = ?`,
      [sourceId]
    );

    // Group entities by claim_id
    type Entity = { id: number; content: string; type: string };
    const entityMap = new Map<number, { evidence: Entity[]; devices: Entity[]; contexts: Entity[]; methods: Entity[] }>();

    function ensureClaim(claimId: number) {
      if (!entityMap.has(claimId)) {
        entityMap.set(claimId, { evidence: [], devices: [], contexts: [], methods: [] });
      }
      return entityMap.get(claimId)!;
    }

    for (const r of evidenceRows) {
      ensureClaim(r.claim_id).evidence.push({ id: r.id, content: r.content, type: r.evidence_type });
    }
    for (const r of deviceRows) {
      ensureClaim(r.claim_id).devices.push({ id: r.id, content: r.content, type: r.device_type });
    }
    for (const r of contextRows) {
      ensureClaim(r.claim_id).contexts.push({ id: r.id, content: r.content, type: r.context_type });
    }
    for (const r of methodRows) {
      ensureClaim(r.claim_id).methods.push({ id: r.id, content: r.content, type: r.method_type });
    }

    return NextResponse.json({
      topics: topicRows.map((r) => ({ id: r.id, name: r.name })),
      claims: claimRows.map((r) => {
        const entities = entityMap.get(r.id) || { evidence: [], devices: [], contexts: [], methods: [] };
        return {
          id: r.id,
          statement: r.statement,
          claim_type: r.claim_type,
          is_key: !!r.is_key,
          computed_confidence: r.computed_confidence,
          score: r.score,
          topic_ids: r.topic_ids ? r.topic_ids.split(',').map(Number) : [],
          evidence: entities.evidence,
          devices: entities.devices,
          contexts: entities.contexts,
          methods: entities.methods,
        };
      }),
    });
  } catch (error) {
    console.error('Source graph API error:', error);
    return NextResponse.json(
      { error: 'Failed to load source graph data' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
