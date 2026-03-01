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
    const themeId = body.theme_id;
    if (typeof themeId !== 'number' || !Number.isInteger(themeId)) {
      return NextResponse.json(
        { error: 'theme_id is required and must be an integer' },
        { status: 400 },
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO claim_themes (claim_id, theme_id) VALUES (?, ?)',
      [claimId, themeId],
    );

    return NextResponse.json(
      { success: true, claim_id: claimId, theme_id: themeId },
      { status: 201 },
    );
  } catch (error: unknown) {
    const mysqlError = error as { code?: string };
    if (mysqlError.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Theme already assigned to this claim' },
        { status: 409 },
      );
    }
    if (mysqlError.code === 'ER_NO_REFERENCED_ROW_2') {
      return NextResponse.json(
        { error: 'Claim or theme not found' },
        { status: 404 },
      );
    }
    console.error('POST /api/claims/[id]/themes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
