import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

interface RouteContext {
  params: Promise<{ id: string; tag: string }>;
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: idParam, tag } = await context.params;
    const claimId = parseInt(idParam, 10);
    if (isNaN(claimId)) {
      return NextResponse.json({ error: 'Invalid claim id' }, { status: 400 });
    }

    const decodedTag = decodeURIComponent(tag);

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM claim_tags WHERE claim_id = ? AND tag = ?',
      [claimId, decodedTag],
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Tag not found on this claim' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, claim_id: claimId, tag: decodedTag });
  } catch (error) {
    console.error('DELETE /api/claims/[id]/tags/[tag] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
