'use client';
import { ContributorListItem } from '@/lib/types';
import { getInitials } from '@/lib/stringUtils';
import TierBadge from '@/components/TierBadge';
import s from '../shared.module.scss';
import ps from './page.module.scss';

interface ContributorListProps {
  contributors: ContributorListItem[];
  selectedId: string | null;
  search: string;
  tierFilter: string;
  onFilter: (key: string, val: string) => void;
  onSelect: (id: number) => void;
}

export default function ContributorList({
  contributors,
  selectedId,
  search,
  tierFilter,
  onFilter,
  onSelect,
}: ContributorListProps) {
  return (
    <div className={s.listPanel}>
      {contributors.length === 0 ? (
        <div className={s.empty}>No contributors found</div>
      ) : (
        contributors.map((c) => (
          <div
            key={c.id}
            className={String(c.id) === selectedId ? s.listItemActive : s.listItem}
            onClick={() => onSelect(c.id)}
          >
            <div className={ps.listItemRow}>
              {c.avatar ? (
                <img src={c.avatar} alt="" className={ps.avatar} />
              ) : (
                <span className={ps.avatarPlaceholder}>
                  {getInitials(c.name)}
                </span>
              )}
              <div className={ps.listItemContent}>
                <div className={s.listItemTitle}>{c.name}</div>
                <div className={s.listItemMeta}>
                  {c.affiliation || 'No affiliation'}
                  {' · '}
                  {c.claim_count} claim{c.claim_count !== 1 ? 's' : ''}
                  {' · '}
                  {c.source_count} source{c.source_count !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
