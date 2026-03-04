'use client';
import { CompositionListItem } from '@/lib/types';
import { compositionStatusLabel } from '@/lib/enumLabels';
import EmptyState from '@/components/EmptyState';
import s from '../shared.module.scss';
import ps from './page.module.scss';

interface CompositionListProps {
  compositions: CompositionListItem[];
  selectedId: string | null;
  onSelect: (id: number) => void;
}

export default function CompositionList({
  compositions,
  selectedId,
  onSelect,
}: CompositionListProps) {
  return (
    <div className={s.listPanel}>
      {compositions.length === 0 ? (
        <EmptyState message="No compositions found" />
      ) : (
        compositions.map((a) => (
          <div
            key={a.id}
            className={
              String(a.id) === selectedId
                ? s.listItemActive
                : s.listItem
            }
            onClick={() => onSelect(a.id)}
          >
            <div className={s.listItemTitle}>{a.title}</div>
            <div className={s.listItemMeta}>
              <span className={ps.statusBadge}>{compositionStatusLabel(a.status)}</span>
              {' \u00B7 '}
              <span>{a.word_count?.toLocaleString()} words</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
