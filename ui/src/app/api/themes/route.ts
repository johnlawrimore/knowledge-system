import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
  try {
    const conn = await pool.getConnection();

    try {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT
           ts.theme_id AS id,
           ts.theme_name AS name,
           ts.thesis,
           COALESCE(ts.claim_count, 0) AS claim_count,
           COALESCE(ts.topics_spanned, 0) AS topics_spanned,
           ts.avg_claim_score,
           COALESCE(ts.well_supported_claims, 0) AS well_supported_claims,
           COALESCE(ts.contested_claims, 0) AS contested_claims
         FROM v_theme_strength ts
         ORDER BY ts.claim_count DESC`
      );

      return NextResponse.json({ themes: rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Themes list API error:', error);
    return NextResponse.json(
      { error: 'Failed to load themes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, thesis, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!thesis || typeof thesis !== 'string' || thesis.trim().length === 0) {
      return NextResponse.json({ error: 'Thesis is required' }, { status: 400 });
    }

    const conn = await pool.getConnection();

    try {
      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO themes (name, thesis, description) VALUES (?, ?, ?)`,
        [name.trim(), thesis.trim(), description || null]
      );

      return NextResponse.json(
        { id: result.insertId, name: name.trim(), thesis: thesis.trim(), description: description || null },
        { status: 201 }
      );
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Theme create API error:', error);
    return NextResponse.json(
      { error: 'Failed to create theme' },
      { status: 500 }
    );
  }
}
