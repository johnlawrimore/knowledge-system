import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: idParam } = await context.params;
    const claimId = parseInt(idParam, 10);
    if (isNaN(claimId)) {
      return NextResponse.json({ error: 'Invalid claim id' }, { status: 400 });
    }

    const body = await request.json();
    const topicId = body.topic_id;
    if (typeof topicId !== 'number' || !Number.isInteger(topicId)) {
      return NextResponse.json(
        { error: 'topic_id is required and must be an integer' },
        { status: 400 },
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO claim_topics (claim_id, topic_id) VALUES (?, ?)',
      [claimId, topicId],
    );

    return NextResponse.json(
      { success: true, claim_id: claimId, topic_id: topicId },
      { status: 201 },
    );
  } catch (error: unknown) {
    const mysqlError = error as { code?: string };
    if (mysqlError.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Topic already assigned to this claim' },
        { status: 409 },
      );
    }
    if (mysqlError.code === 'ER_NO_REFERENCED_ROW_2') {
      return NextResponse.json(
        { error: 'Claim or topic not found' },
        { status: 404 },
      );
    }
    console.error('POST /api/claims/[id]/topics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
