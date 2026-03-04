'use client';

import EmptyState from '@/components/EmptyState';
import SourceTypeBadge from '@/components/SourceTypeBadge';
import MetaLine from '@/components/MetaLine';
import { SOURCE_TYPES } from '@/lib/sourceTypes';
import { SourceListItem } from '@/lib/types';
import s from './page.module.scss';

interface SourceListProps {
  sources: SourceListItem[];
  total: number;
  selectedId: string | null;
  status: string;
  type: string;
  search: string;
  onFilter: (key: string, val: string) => void;
  onSelect: (id: number) => void;
}

export default function SourceList({
  sources,
  selectedId,
  type,
  search,
  onFilter,
}: SourceListProps) {
  return (
    <div className={s.listPanel}>
      {sources.length === 0 ? (
        <EmptyState message="No sources found" />
      ) : (
        sources.map((src) => (
            <div
              key={src.id}
              className={String(src.id) === selectedId ? s.sourceItemActive : s.sourceItem}
              onClick={() => onFilter('id', String(src.id))}
            >
              <div className={s.sourceTitle}>{src.title}</div>
              <MetaLine>
                <SourceTypeBadge type={src.source_type} size={14} />
                {src.main_contributor && <span>{src.main_contributor}</span>}
              </MetaLine>
            </div>
        ))
      )}
    </div>
  );
}
