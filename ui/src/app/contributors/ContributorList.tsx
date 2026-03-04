'use client';
import { ContributorListItem } from '@/lib/types';
import Avatar from '@/components/Avatar';
import EmptyState from '@/components/EmptyState';
import TierBadge from '@/components/TierBadge';
import MetaLine from '@/components/MetaLine';
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
        <EmptyState message="No contributors found" />
      ) : (
        contributors.map((c) => (
          <div
            key={c.id}
            className={String(c.id) === selectedId ? s.listItemActive : s.listItem}
            onClick={() => onSelect(c.id)}
          >
            <div className={ps.listItemRow}>
              <Avatar name={c.name} url={c.avatar} size={48} />
              <div className={ps.listItemContent}>
                <div className={s.listItemTitle}>{c.name}</div>
                <MetaLine className={s.listItemMeta}>
                  <span>{c.affiliation || 'No affiliation'}</span>
                  <span>{c.claim_count} claim{c.claim_count !== 1 ? 's' : ''}</span>
                  <span>{c.source_count} source{c.source_count !== 1 ? 's' : ''}</span>
                </MetaLine>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
