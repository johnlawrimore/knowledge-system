'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { pageIcon } from '@/lib/pageIcons';
import ScoreRing from '@/components/ScoreRing';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import TierBadge from '@/components/TierBadge';
import { DimensionGrid } from '@/components/EvalSection';
import s from './page.module.scss';

const DashboardIcon = pageIcon('dashboard');

/* ── Types ──────────────────────────────────────────────────────── */

interface DashboardData {
  counts: { sources: number; claims: number; contributors: number };
  distributions: {
    claimConfidence: Record<string, number>;
    sourceGrades: Record<string, number>;
    contributorTiers: Record<string, number>;
  };
  evalAverages: {
    claimValidity: Record<string, number | null>;
    claimSubstance: Record<string, number | null>;
    sourceQuality: Record<string, number | null>;
    sourceRigor: Record<string, number | null>;
  };
  topicCoverage: {
    topic_id: number; topic_name: string;
    claim_count: number; avg_claim_score: number;
  }[];
  themeStrength: {
    theme_id: number; theme_name: string; thesis: string;
    claim_count: number; topics_spanned: number;
    avg_claim_score: number; well_supported_claims: number; contested_claims: number;
  }[];
  topContributors: {
    id: number; name: string; affiliation: string | null;
    avatar: string | null; tier: number | null;
    claim_count: number; source_count: number;
  }[];
  thinClaims: {
    ref_id: string; display_text: string;
    computed_confidence: string; score: number;
    supporting_sources: number; contradicting_sources: number;
  }[];
  thinClaimsTotal: number;
}

/* ── Helpers ────────────────────────────────────────────────────── */

function distPct(dist: Record<string, number>, key: string): number {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  return total > 0 ? ((dist[key] || 0) / total) * 100 : 0;
}

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ── Component ──────────────────────────────────────────────────── */

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return <div className={s.loading}>Loading dashboard...</div>;

  const { counts, distributions, evalAverages, topicCoverage, themeStrength, topContributors, thinClaims } = data;
  const maxTopicCount = Math.max(...topicCoverage.map((t) => t.claim_count), 1);

  // Confidence distribution items
  const confItems = [
    { key: 'strong', label: 'Strong', cls: s.segStrong },
    { key: 'moderate', label: 'Moderate', cls: s.segModerate },
    { key: 'developing', label: 'Developing', cls: s.segDeveloping },
    { key: 'contested', label: 'Contested', cls: s.segContested },
    { key: 'unsupported', label: 'Unsupported', cls: s.segUnsupported },
  ];

  // Grade distribution items
  const gradeItems = [
    { key: 'A', label: 'A', cls: s.segA },
    { key: 'B', label: 'B', cls: s.segB },
    { key: 'C', label: 'C', cls: s.segC },
    { key: 'D', label: 'D', cls: s.segD },
    { key: 'F', label: 'F', cls: s.segF },
  ];

  // Tier distribution items
  const tierItems = [
    { key: '1', label: 'Leading', cls: s.segTier1 },
    { key: '2', label: 'Expert', cls: s.segTier2 },
    { key: '3', label: 'Notable', cls: s.segTier3 },
    { key: '4', label: 'Emerging', cls: s.segTier4 },
  ];

  return (
    <div className={s.dashboard}>
      <h1 className={s.title}>
        <DashboardIcon size={32} stroke={2} className={s.pageIcon} />
        Dashboard
      </h1>

      {/* ── Stat Cards ──────────────────────────────────────────── */}
      <div className={s.statsRow}>
        {/* Claims */}
        <Link href="/claims" className={`${s.statCard} ${s.statCardClaims}`}>
          <div className={s.statLabel}>Claims</div>
          <div className={s.statValue}>{counts.claims}</div>
          <div className={s.distBar}>
            {confItems.map((c) => (
              <div key={c.key} className={`${s.distSegment} ${c.cls}`}
                style={{ width: `${distPct(distributions.claimConfidence, c.key)}%` }} />
            ))}
          </div>
          <div className={s.distLegend}>
            {confItems.filter((c) => distributions.claimConfidence[c.key]).map((c) => (
              <span key={c.key} className={s.legendItem}>
                <span className={s.legendDot} style={{ background: c.key === 'developing' ? 'var(--text-muted)' : `var(--accent-${c.key === 'strong' ? 'green' : c.key === 'moderate' ? 'blue' : c.key === 'contested' ? 'orange' : c.key === 'unsupported' ? 'red' : ''})` }} />
                {distributions.claimConfidence[c.key]} {c.label}
              </span>
            ))}
          </div>
        </Link>

        {/* Sources */}
        <Link href="/sources" className={`${s.statCard} ${s.statCardSources}`}>
          <div className={s.statLabel}>Sources</div>
          <div className={s.statValue}>{counts.sources}</div>
          <div className={s.distBar}>
            {gradeItems.map((g) => (
              <div key={g.key} className={`${s.distSegment} ${g.cls}`}
                style={{ width: `${distPct(distributions.sourceGrades, g.key)}%` }} />
            ))}
          </div>
          <div className={s.distLegend}>
            {gradeItems.filter((g) => distributions.sourceGrades[g.key]).map((g) => (
              <span key={g.key} className={s.legendItem}>
                <span className={s.legendDot} style={{ background: g.key === 'C' ? 'var(--text-muted)' : `var(--accent-${g.key === 'A' ? 'green' : g.key === 'B' ? 'blue' : g.key === 'D' ? 'orange' : g.key === 'F' ? 'red' : ''})` }} />
                {distributions.sourceGrades[g.key]} Grade {g.label}
              </span>
            ))}
          </div>
        </Link>

        {/* Contributors */}
        <Link href="/contributors" className={`${s.statCard} ${s.statCardContributors}`}>
          <div className={s.statLabel}>Contributors</div>
          <div className={s.statValue}>{counts.contributors}</div>
          <div className={s.distBar}>
            {tierItems.map((t) => (
              <div key={t.key} className={`${s.distSegment} ${t.cls}`}
                style={{ width: `${distPct(distributions.contributorTiers, t.key)}%` }} />
            ))}
          </div>
          <div className={s.distLegend}>
            {tierItems.filter((t) => distributions.contributorTiers[t.key]).map((t) => (
              <span key={t.key} className={s.legendItem}>
                <span className={s.legendDot} style={{ background: t.key === '4' ? 'var(--text-muted)' : `var(--accent-${t.key === '1' ? 'green' : t.key === '2' ? 'blue' : t.key === '3' ? 'purple' : ''})` }} />
                {distributions.contributorTiers[t.key]} {t.label}
              </span>
            ))}
          </div>
        </Link>
      </div>

      {/* ── Evaluation Averages ─────────────────────────────────── */}
      <div className={s.evalRow}>
        <div className={s.evalCard}>
          <div className={`${s.evalHeader} ${s.evalHeaderClaim}`}>
            <span className={`${s.evalHeaderLabel} ${s.evalHeaderLabelClaim}`}>Claim Evaluation</span>
          </div>
          <div className={s.evalBody}>
            <DimensionGrid dimensions={evalAverages.claimValidity} columns={3} label="Validity" />
            <DimensionGrid dimensions={evalAverages.claimSubstance} columns={3} label="Substance" />
          </div>
        </div>

        <div className={s.evalCard}>
          <div className={`${s.evalHeader} ${s.evalHeaderSource}`}>
            <span className={`${s.evalHeaderLabel} ${s.evalHeaderLabelSource}`}>Source Evaluation</span>
          </div>
          <div className={s.evalBody}>
            <DimensionGrid dimensions={evalAverages.sourceQuality} columns={4} label="Quality" />
            <DimensionGrid dimensions={evalAverages.sourceRigor} columns={4} label="Rigor" />
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ───────────────────────────────────── */}
      <div className={s.contentGrid}>
        {/* Left column */}
        <div className={s.column}>
          {/* Topic Coverage */}
          <div className={s.panel}>
            <div className={s.panelTitle}>Topic Coverage</div>
            {topicCoverage.length === 0 ? (
              <div className={s.empty}>No topics yet</div>
            ) : (
              topicCoverage.map((t) => (
                <Link key={t.topic_id} href={`/topics?id=${t.topic_id}`} className={s.topicRow}>
                  <span className={s.topicName}>{t.topic_name}</span>
                  <div className={s.topicBar}>
                    <div className={s.topicBarFill} style={{ width: `${(t.claim_count / maxTopicCount) * 100}%` }} />
                  </div>
                  <span className={s.topicCount}>{t.claim_count}</span>
                  <span className={s.topicScore}>
                    <ScoreRing value={t.avg_claim_score != null ? Math.round(t.avg_claim_score) : null} size={28} />
                  </span>
                </Link>
              ))
            )}
          </div>

          {/* Top Contributors */}
          <div className={s.panel}>
            <div className={s.panelTitle}>Top Contributors</div>
            {topContributors.length === 0 ? (
              <div className={s.empty}>No contributors yet</div>
            ) : (
              topContributors.map((c) => (
                <Link key={c.id} href={`/contributors?id=${c.id}`} className={s.contributorRow}>
                  {c.avatar ? (
                    <img src={c.avatar} alt="" className={s.contributorAvatar} />
                  ) : (
                    <span className={s.avatarFallback}>{getInitials(c.name)}</span>
                  )}
                  <div className={s.contributorInfo}>
                    <div className={s.contributorName}>{c.name}</div>
                    {c.affiliation && <div className={s.contributorAffiliation}>{c.affiliation}</div>}
                  </div>
                  <TierBadge tier={c.tier} />
                  <span className={s.contributorStats}>
                    {c.claim_count} claims · {c.source_count} src
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className={s.column}>
          {/* Progressing Themes */}
          <div className={s.panel}>
            <div className={s.panelTitle}>Progressing Themes</div>
            {themeStrength.length === 0 ? (
              <div className={s.empty}>No themes yet</div>
            ) : (
              themeStrength.map((t) => (
                <Link key={t.theme_id} href={`/themes?id=${t.theme_id}`} className={s.themeRow}>
                  <div className={s.themeTop}>
                    <div className={s.themeInfo}>
                      <div className={s.themeName}>{t.theme_name}</div>
                      {t.thesis && <div className={s.themeThesis}>{t.thesis}</div>}
                      <div className={s.themeMeta}>
                        <span>{t.claim_count} claims</span>
                        <span>{t.topics_spanned} topics</span>
                        {t.well_supported_claims > 0 && (
                          <span className={s.themeMetaGreen}>{t.well_supported_claims} supported</span>
                        )}
                        {t.contested_claims > 0 && (
                          <span className={s.themeMetaOrange}>{t.contested_claims} contested</span>
                        )}
                      </div>
                    </div>
                    <span className={s.themeScore}>
                      <ScoreRing value={t.avg_claim_score != null ? Math.round(t.avg_claim_score) : null} size={32} />
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Thin Claims */}
          <div className={s.panel}>
            <div className={s.panelTitle}>
              Thin Claims <span className={s.panelTitleCount}>({data.thinClaimsTotal} total)</span>
            </div>
            {thinClaims.length === 0 ? (
              <div className={s.empty}>No thin claims — nice!</div>
            ) : (
              thinClaims.map((c) => {
                const claimId = c.ref_id.replace('claim:', '');
                return (
                  <Link key={c.ref_id} href={`/claims/${claimId}`} className={s.thinClaimRow}>
                    <div className={s.thinClaimTop}>
                      <span className={s.thinClaimId}>#{claimId}</span>
                      <ConfidenceBadge confidence={c.computed_confidence} />
                      <span className={s.thinClaimMeta}>
                        <span className={c.supporting_sources < 2 ? s.thinClaimWarn : ''}>
                          {c.supporting_sources} source{c.supporting_sources !== 1 ? 's' : ''}
                        </span>
                        {c.contradicting_sources > 0 && (
                          <>{' · '}<span className={s.thinClaimWarn}>{c.contradicting_sources} contradicting</span></>
                        )}
                      </span>
                    </div>
                    <div className={s.thinClaimStatement}>{c.display_text}</div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
