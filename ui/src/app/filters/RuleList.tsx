'use client';

import { FilterListItem } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import s from '../shared.module.scss';

export default function FilterList({
  filters,
  selectedId,
  onSelect,
  onCreate,
}: {
  filters: FilterListItem[];
  selectedId: string | null;
  onSelect: (id: number) => void;
  onCreate: () => void;
}) {
  return (
    <div className={s.listPanel}>
      {filters.length === 0 && (
        <EmptyState message="No content filters yet" />
      )}
      {filters.map((f) => (
        <div
          key={f.id}
          className={String(f.id) === selectedId ? s.listItemActive : s.listItem}
          onClick={() => onSelect(f.id)}
        >
          <div className={s.listItemTitle}>
            {f.name}
            {!f.is_active && (
              <span style={{ marginLeft: '0.375rem', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>inactive</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
