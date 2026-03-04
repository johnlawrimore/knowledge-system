import Link from 'next/link';
import SourceTypeBadge from '@/components/SourceTypeBadge';
import MetaLine from '@/components/MetaLine';
import { formatDate } from '@/lib/formatDate';
import type { SourceLinkItem } from '@/lib/types';
import s from './SourceLinkList.module.scss';

interface SourceLinkListProps<T extends SourceLinkItem> {
  sources: T[];
  layout?: 'stacked' | 'inline';
  renderExtra?: (source: T) => React.ReactNode;
}

export default function SourceLinkList<T extends SourceLinkItem>({
  sources,
  layout = 'inline',
  renderExtra,
}: SourceLinkListProps<T>) {
  return (
    <div className={s.list}>
      {sources.map((src) => (
        <div key={src.id} className={s.row}>
          {layout === 'inline' ? (
            <MetaLine>
              <Link href={`/sources?id=${src.id}`} className={s.title}>
                {src.title}
              </Link>
              <SourceTypeBadge type={src.source_type} size={13} />
              {src.main_contributor && <span>{src.main_contributor}</span>}
              {src.publication && src.publication !== src.main_contributor && <span>{src.publication}</span>}
              {src.published_date && <span>{formatDate(src.published_date)}</span>}
            </MetaLine>
          ) : (
            <>
              <Link href={`/sources?id=${src.id}`} className={s.title}>
                {src.title}
              </Link>
              <MetaLine>
                <SourceTypeBadge type={src.source_type} size={13} />
                {src.main_contributor && <span>{src.main_contributor}</span>}
                {src.publication && src.publication !== src.main_contributor && <span>{src.publication}</span>}
                {src.published_date && <span>{formatDate(src.published_date)}</span>}
              </MetaLine>
            </>
          )}
          {renderExtra?.(src)}
        </div>
      ))}
    </div>
  );
}
