import Link from 'next/link';
import Avatar from '@/components/Avatar';
import TierBadge from '@/components/TierBadge';
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
            <Avatar name={c.name} url={c.avatar} size={28} />
            <div className={s.contributorInfo}>
              <div className={s.contributorName}>{c.name}</div>
              {c.affiliation && <div className={s.contributorAffiliation}>{c.affiliation}</div>}
            </div>
            <span className={s.contributorStats}>
              {c.source_count} source · {c.claim_count} claims
            </span>
            <TierBadge tier={c.tier} />
          </Link>
        ))
      )}
    </div>
  );
}
