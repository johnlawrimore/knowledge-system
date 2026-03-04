import Link from 'next/link';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import { DashboardData } from '@/lib/types';
import s from '../page.module.scss';

export default function DashboardThinClaims({
  claims,
  total,
}: {
  claims: DashboardData['thinClaims'];
  total: number;
}) {
  return (
    <div className={s.panel}>
      <div className={s.panelTitle}>
        Thin Claims <span className={s.panelTitleCount}>({total} total)</span>
      </div>
      {claims.length === 0 ? (
        <div className={s.empty}>No thin claims — nice!</div>
      ) : (
        claims.map((c) => {
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
  );
}
