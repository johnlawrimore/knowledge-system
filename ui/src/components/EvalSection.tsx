import { ReactNode } from 'react';
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
    <>
      {label && <div className={s.groupLabel}>{label}</div>}
      <div className={`${s.dimensionGrid} ${colClass}`}>
        {Object.entries(dimensions).map(([key, val]) => (
          <div key={key} className={s.dimensionItem}>
            <span className={`${s.dimensionValue} ${val != null ? s[`score${val}`] || '' : ''}`}>
              {val ?? '–'}
            </span>
            <span className={s.dimensionLabel}>{key}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── EvalSection ───────────────────────────────────────────────── */

interface EvalSectionProps {
  label: string;
  evaluatedAt?: string | null;
  headerRight?: ReactNode;
  notes?: string | null;
  children: ReactNode;
}

export default function EvalSection({ label, evaluatedAt, headerRight, notes, children }: EvalSectionProps) {
  return (
    <div className={s.evalSection}>
      <div className={s.evalHeader}>
        <div className={s.evalLabel}>{label}</div>
        <div className={s.evalHeaderRight}>
          {headerRight}
          {evaluatedAt && <span className={s.evaluatedAt}>{formatDate(evaluatedAt)}</span>}
        </div>
      </div>
      {children}
      {notes && <div className={s.notes}>{notes}</div>}
    </div>
  );
}
