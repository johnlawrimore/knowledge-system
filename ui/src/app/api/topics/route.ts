import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface TopicRow {
  id: number;
  name: string;
  description: string | null;
  parent_topic_id: number | null;
  sort_order: number;
  created_at: string;
  claim_count: number;
  evidence_count: number;
  source_count: number;
  avg_claim_score: number | null;
}

interface TopicNode extends TopicRow {
  children: TopicNode[];
}

function buildTree(topics: TopicRow[]): TopicNode[] {
  const map = new Map<number, TopicNode>();
  const roots: TopicNode[] = [];

  // Create nodes
  for (const topic of topics) {
    map.set(topic.id, { ...topic, children: [] });
  }

  // Build tree
  for (const topic of topics) {
    const node = map.get(topic.id)!;
    if (topic.parent_topic_id && map.has(topic.parent_topic_id)) {
      map.get(topic.parent_topic_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function GET() {
  try {
    const conn = await pool.getConnection();

    try {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT
           t.id, t.name, t.description, t.parent_topic_id,
           t.sort_order, t.created_at,
           COALESCE(tc.claim_count, 0) AS claim_count,
           COALESCE(tc.evidence_count, 0) AS evidence_count,
           COALESCE(tc.source_count, 0) AS source_count,
           tc.avg_claim_score
         FROM topics t
         LEFT JOIN v_topic_coverage tc ON t.id = tc.topic_id
         ORDER BY t.sort_order, t.name`
      );

      const tree = buildTree(rows as TopicRow[]);

      return NextResponse.json({ topics: tree });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Topics list API error:', error);
    return NextResponse.json(
      { error: 'Failed to load topics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, parent_topic_id } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const conn = await pool.getConnection();

    try {
      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO topics (name, description, parent_topic_id) VALUES (?, ?, ?)`,
        [name.trim(), description || null, parent_topic_id || null]
      );

      return NextResponse.json(
        { id: result.insertId, name: name.trim(), description: description || null, parent_topic_id: parent_topic_id || null },
        { status: 201 }
      );
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Topic create API error:', error);
    return NextResponse.json(
      { error: 'Failed to create topic' },
      { status: 500 }
    );
  }
}
