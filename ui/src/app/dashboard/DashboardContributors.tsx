import Link from 'next/link';
import TierBadge from '@/components/TierBadge';
import { getInitials } from '@/lib/stringUtils';
import { DashboardData } from '@/lib/types';
import s from '../page.module.scss';

export default function DashboardContributors({
  contributors,
}: {
  contributors: DashboardData['topContributors'];
}) {
  return (
    <div className={s.panel}>
      <div className={s.panelTitle}>Top Contributors</div>
      {contributors.length === 0 ? (
        <div className={s.empty}>No contributors yet</div>
      ) : (
        contributors.map((c) => (
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
  );
}
