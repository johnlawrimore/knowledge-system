import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

interface RouteContext {
  params: Promise<{ id: string; tid: string }>;
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: idParam, tid: tidParam } = await context.params;
    const claimId = parseInt(idParam, 10);
    const topicId = parseInt(tidParam, 10);
    if (isNaN(claimId) || isNaN(topicId)) {
      return NextResponse.json(
        { error: 'Invalid claim id or topic id' },
        { status: 400 },
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM claim_topics WHERE claim_id = ? AND topic_id = ?',
      [claimId, topicId],
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Topic assignment not found for this claim' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, claim_id: claimId, topic_id: topicId });
  } catch (error) {
    console.error('DELETE /api/claims/[id]/topics/[tid] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
