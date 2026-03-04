'use client';

import Link from 'next/link';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import { TopicDetail, ClaimRow } from '@/lib/types';
import s from '../shared.module.scss';

function ClaimSection({ title, claims }: { title: string; claims: ClaimRow[] }) {
  if (claims.length === 0) return null;
  return (
    <div className={s.detailSection}>
      <div className={s.detailLabel}>{title}</div>
      <div className={s.claimList}>
        {claims.map((c) => (
          <Link key={c.id} href={`/claims/${c.id}`} className={s.claimRow}>
            <span className={s.claimScore}>
              <ConfidenceBadge confidence={c.computed_confidence} score={c.score} />
            </span>{' '}
            <span className={s.claimStatement}>{c.statement}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function TopicDetailPanel({
  detail,
}: {
  detail: TopicDetail;
}) {
  return (
    <>
      {detail.description && (
        <div className={s.detailSection}>
          <div className={s.detailValue}>{detail.description}</div>
        </div>
      )}

      <div className={s.detailSection}>
        <div className={s.detailLabel}>Statistics</div>
        <div className={s.detailValue}>
          {detail.claims.length} claims
          {detail.source_count > 0 && <> &middot; {detail.source_count} sources</>}
          {detail.avg_claim_score != null && (
            <> &middot; avg score: {Number(detail.avg_claim_score).toFixed(1)}</>
          )}
        </div>
      </div>

      <hr className={s.divider} />

      <ClaimSection title="Strongest Claims" claims={detail.strongest} />

      {detail.claims.length > 0 && (
        <div className={s.detailSection}>
          <Link
            href={`/claims?topic=${detail.id}`}
            style={{ fontSize: '0.8125rem', color: 'var(--accent-blue)' }}
          >
            All {detail.claims.length} claims →
          </Link>
        </div>
      )}
    </>
  );
}
