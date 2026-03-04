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
        sources.map((src) => {
          const isReady = src.status === 'decomposed';
          return (
            <div
              key={src.id}
              className={
                !isReady ? s.sourceItemDisabled
                  : String(src.id) === selectedId ? s.sourceItemActive
                  : s.sourceItem
              }
              onClick={isReady ? () => onFilter('id', String(src.id)) : undefined}
            >
              <div className={s.sourceTitle}>{src.title}</div>
              <MetaLine>
                <SourceTypeBadge type={src.source_type} size={14} />
                {src.main_contributor && <span>{src.main_contributor}</span>}
                {!isReady && <span className={s.processingBadge}>Processing</span>}
              </MetaLine>
            </div>
          );
        })
      )}
    </div>
  );
}
