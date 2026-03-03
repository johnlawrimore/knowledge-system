import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const conn = await pool.getConnection();

    try {
      // ── Aggregate counts ────────────────────────────────────────
      const [[totalSources]] = await conn.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM sources'
      );
      const [[totalClaims]] = await conn.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM claims'
      );
      const [[totalContributors]] = await conn.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM contributors'
      );

      const counts = {
        sources: Number(totalSources.count),
        claims: Number(totalClaims.count),
        contributors: Number(totalContributors.count),
      };

      // ── Distributions ───────────────────────────────────────────
      const [confidenceRows] = await conn.query<RowDataPacket[]>(
        `SELECT computed_confidence, COUNT(*) as count
         FROM v_all_scored
         GROUP BY computed_confidence`
      );
      const claimConfidence: Record<string, number> = {};
      for (const row of confidenceRows) {
        claimConfidence[row.computed_confidence] = Number(row.count);
      }

      const [gradeRows] = await conn.query<RowDataPacket[]>(
        `SELECT JSON_UNQUOTE(JSON_EXTRACT(evaluation_results, '$.grade')) as grade,
                COUNT(*) as count
         FROM sources
         WHERE evaluation_results IS NOT NULL
           AND JSON_EXTRACT(evaluation_results, '$.grade') IS NOT NULL
         GROUP BY grade`
      );
      const sourceGrades: Record<string, number> = {};
      for (const row of gradeRows) {
        sourceGrades[row.grade] = Number(row.count);
      }

      const [tierRows] = await conn.query<RowDataPacket[]>(
        `SELECT JSON_UNQUOTE(JSON_EXTRACT(evaluation_results, '$.tier')) as tier,
                COUNT(*) as count
         FROM contributors
         WHERE evaluation_results IS NOT NULL
           AND JSON_EXTRACT(evaluation_results, '$.tier') IS NOT NULL
         GROUP BY tier`
      );
      const contributorTiers: Record<string, number> = {};
      for (const row of tierRows) {
        contributorTiers[row.tier] = Number(row.count);
      }

      // ── Evaluation averages ─────────────────────────────────────
      const [[claimEvalRow]] = await conn.query<RowDataPacket[]>(
        `SELECT
           ROUND(AVG(JSON_EXTRACT(evaluation_results, '$.validity.factuality')), 1) as avg_factuality,
           ROUND(AVG(JSON_EXTRACT(evaluation_results, '$.validity.soundness')), 1) as avg_soundness,
           ROUND(AVG(JSON_EXTRACT(evaluation_results, '$.validity.consensus')), 1) as avg_consensus,
           ROUND(AVG(JSON_EXTRACT(evaluation_results, '$.substance.originality')), 1) as avg_originality,
           ROUND(AVG(JSON_EXTRACT(evaluation_results, '$.substance.practicality')), 1) as avg_practicality,
           ROUND(AVG(JSON_EXTRACT(evaluation_results, '$.substance.impact')), 1) as avg_impact
         FROM claims
         WHERE evaluation_results IS NOT NULL`
      );

      const [[sourceEvalRow]] = await conn.query<RowDataPacket[]>(
        `SELECT
           ROUND(AVG(JSON_EXTRACT(evaluation_results, '$.quality.completeness')), 1) as avg_completeness,
           ROUND(AVG(JSON_EXTRACT(evaluation_results, '$.quality.coherence')), 1) as avg_coherence,
           ROUND(AVG(JSON_EXTRACT(evaluation_results, '$.quality.depth')), 1) as avg_depth,
           ROUND(AVG(JSON_EXTRACT(evaluation_results, '$.quality.clarity')), 1) as avg_clarity,
           ROUND(AVG(JSON_EXTRACT(evaluation_results, '$.rigor.objectivity')), 1) as avg_objectivity,
           ROUND(AVG(JSON_EXTRACT(evaluation_results, '$.rigor.substantiation')), 1) as avg_substantiation,
           ROUND(AVG(JSON_EXTRACT(evaluation_results, '$.rigor.persuasiveness')), 1) as avg_persuasiveness,
           ROUND(AVG(JSON_EXTRACT(evaluation_results, '$.rigor.temperance')), 1) as avg_temperance
         FROM sources
         WHERE evaluation_results IS NOT NULL`
      );

      const toNum = (v: unknown) => (v != null ? Number(v) : null);

      const evalAverages = {
        claimValidity: {
          Factuality: toNum(claimEvalRow?.avg_factuality),
          Soundness: toNum(claimEvalRow?.avg_soundness),
          Consensus: toNum(claimEvalRow?.avg_consensus),
        },
        claimSubstance: {
          Originality: toNum(claimEvalRow?.avg_originality),
          Practicality: toNum(claimEvalRow?.avg_practicality),
          Impact: toNum(claimEvalRow?.avg_impact),
        },
        sourceQuality: {
          Completeness: toNum(sourceEvalRow?.avg_completeness),
          Coherence: toNum(sourceEvalRow?.avg_coherence),
          Depth: toNum(sourceEvalRow?.avg_depth),
          Clarity: toNum(sourceEvalRow?.avg_clarity),
        },
        sourceRigor: {
          Objectivity: toNum(sourceEvalRow?.avg_objectivity),
          Substantiation: toNum(sourceEvalRow?.avg_substantiation),
          Persuasiveness: toNum(sourceEvalRow?.avg_persuasiveness),
          Temperance: toNum(sourceEvalRow?.avg_temperance),
        },
      };

      // ── Topic coverage (top 10) ─────────────────────────────────
      const [topicCoverage] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM v_topic_coverage ORDER BY claim_count DESC LIMIT 10'
      );

      // ── Theme strength (top 10) ─────────────────────────────────
      const [themeStrength] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM v_theme_strength ORDER BY claim_count DESC LIMIT 10'
      );

      // ── Top contributors ────────────────────────────────────────
      const [topContributors] = await conn.query<RowDataPacket[]>(
        `SELECT
           c.id, c.name, c.affiliation, c.avatar,
           JSON_EXTRACT(c.evaluation_results, '$.tier') as tier,
           COUNT(DISTINCT cs2.claim_id) as claim_count,
           COUNT(DISTINCT sc.source_id) as source_count
         FROM contributors c
         LEFT JOIN source_contributors sc ON c.id = sc.contributor_id
         LEFT JOIN claim_sources cs2 ON sc.source_id = cs2.source_id
         GROUP BY c.id, c.name, c.affiliation, c.avatar, tier
         ORDER BY
           COALESCE(JSON_EXTRACT(c.evaluation_results, '$.tier'), 99) ASC,
           claim_count DESC
         LIMIT 8`
      );

      // ── Thin claims ─────────────────────────────────────────────
      const [thinClaims] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM v_thin_claims ORDER BY score DESC LIMIT 10'
      );
      const [[thinTotal]] = await conn.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM v_thin_claims'
      );

      return NextResponse.json({
        counts,
        distributions: {
          claimConfidence,
          sourceGrades,
          contributorTiers,
        },
        evalAverages,
        topicCoverage,
        themeStrength,
        topContributors,
        thinClaims,
        thinClaimsTotal: Number(thinTotal.count),
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
