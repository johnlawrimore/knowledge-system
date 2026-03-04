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
          <div className={s.listItemMeta}>
            {f.sources_applied > 0 && (
              <span style={{ color: 'var(--text-muted)' }}>· {f.sources_applied} source{f.sources_applied === 1 ? '' : 's'}</span>
            )}
            {f.description && (
              <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {f.description}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
