import Link from 'next/link';
import { DashboardData } from '@/lib/types';
import s from '../page.module.scss';

function distPct(dist: Record<string, number>, key: string): number {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  return total > 0 ? ((dist[key] || 0) / total) * 100 : 0;
}

const confItems = [
  { key: 'strong', label: 'Strong', cls: s.segStrong },
  { key: 'moderate', label: 'Moderate', cls: s.segModerate },
  { key: 'developing', label: 'Developing', cls: s.segDeveloping },
  { key: 'contested', label: 'Contested', cls: s.segContested },
  { key: 'unsupported', label: 'Unsupported', cls: s.segUnsupported },
];

const gradeItems = [
  { key: 'A', label: 'A', cls: s.segA },
  { key: 'B', label: 'B', cls: s.segB },
  { key: 'C', label: 'C', cls: s.segC },
  { key: 'D', label: 'D', cls: s.segD },
  { key: 'F', label: 'F', cls: s.segF },
];

const tierItems = [
  { key: '1', label: 'Leading', cls: s.segTier1 },
  { key: '2', label: 'Expert', cls: s.segTier2 },
  { key: '3', label: 'Notable', cls: s.segTier3 },
  { key: '4', label: 'Emerging', cls: s.segTier4 },
];

export default function DashboardCounts({
  counts,
  distributions,
}: {
  counts: DashboardData['counts'];
  distributions: DashboardData['distributions'];
}) {
  return (
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
  );
}
