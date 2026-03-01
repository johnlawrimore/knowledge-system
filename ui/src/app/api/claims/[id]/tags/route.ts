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
    const tag = body.tag;
    if (typeof tag !== 'string' || tag.trim().length === 0) {
      return NextResponse.json(
        { error: 'tag is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    const normalizedTag = tag.trim();

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO claim_tags (claim_id, tag) VALUES (?, ?)',
      [claimId, normalizedTag],
    );

    return NextResponse.json(
      { success: true, claim_id: claimId, tag: normalizedTag },
      { status: 201 },
    );
  } catch (error: unknown) {
    const mysqlError = error as { code?: string };
    if (mysqlError.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Tag already assigned to this claim' },
        { status: 409 },
      );
    }
    if (mysqlError.code === 'ER_NO_REFERENCED_ROW_2') {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 },
      );
    }
    console.error('POST /api/claims/[id]/tags error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
