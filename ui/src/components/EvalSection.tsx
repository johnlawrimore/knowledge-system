import { ReactNode } from 'react';
import ScoreRing from './ScoreRing';
import { formatDate } from '@/lib/formatDate';
import s from './EvalSection.module.scss';

/* ── DimensionGrid ─────────────────────────────────────────────── */

interface DimensionGridProps {
  dimensions: Record<string, number | null>;
  columns?: 3 | 4;
  label?: string;
}

export function DimensionGrid({ dimensions, columns = 4, label }: DimensionGridProps) {
  const colClass = columns === 3 ? s.cols3 : s.cols4;
  return (
    <div className={s.group}>
      {label && <div className={s.groupLabel}>{label}</div>}
      <div className={`${s.dimensionGrid} ${colClass}`}>
        {Object.entries(dimensions).map(([key, val]) => (
          <div key={key} className={s.dimensionItem}>
            <ScoreRing value={val} />
            <span className={s.dimensionLabel}>{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── EvalSection ───────────────────────────────────────────────── */

interface EvalSectionProps {
  label: string;
  evaluatedAt?: string | null;
  headerRight?: ReactNode;
  notes?: string | null;
  row?: boolean;
  children: ReactNode;
}

export default function EvalSection({ label, evaluatedAt, headerRight, notes, row, children }: EvalSectionProps) {
  return (
    <div className={s.card}>
      <div className={s.header}>
        <span className={s.headerLabel}>{label}</span>
        {headerRight && <div className={s.headerRight}>{headerRight}</div>}
      </div>
      <div className={s.body}>
        <div className={row ? s.contentRow : s.contentCol}>
          {children}
        </div>
        {notes && <div className={s.notes}>{notes}</div>}
        {evaluatedAt && (
          <div className={s.evaluatedAt}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Last updated {formatDate(evaluatedAt)}
          </div>
        )}
      </div>
    </div>
  );
}
