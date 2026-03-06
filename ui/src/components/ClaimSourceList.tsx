import Link from 'next/link';
import SourceTypeBadge from '@/components/SourceTypeBadge';
import MetaLine from '@/components/MetaLine';
import KeyBadge from '@/components/KeyBadge';
import { formatDate } from '@/lib/formatDate';
import { sourceConfidenceLabel, convictionLabel } from '@/lib/enumLabels';
import type { ClaimSource } from '@/lib/types';
import s from './ClaimSourceList.module.scss';

interface ClaimSourceListProps {
  sources: ClaimSource[];
}

export default function ClaimSourceList({ sources }: ClaimSourceListProps) {
  return (
    <div className={s.list}>
      {sources.map((src) => (
        <div key={src.id} className={s.row}>
          <div className={s.titleLine}>
            <Link href={`/sources?id=${src.id}`} className={s.title}>
              {src.title}
            </Link>
            {!!src.is_key && <KeyBadge />}
          </div>
          <div className={s.metaLine}>
            <MetaLine>
              <SourceTypeBadge type={src.source_type} size={13} />
              {src.main_contributor && <span>{src.main_contributor}</span>}
              {src.publication && src.publication !== src.main_contributor && (
                <span>{src.publication}</span>
              )}
              {src.published_date && <span>{formatDate(src.published_date)}</span>}
            </MetaLine>
            {(src.confidence || src.conviction) && (
              <span className={s.tags}>
                {src.confidence && (
                  <span className={s.tag}>
                    <span className={s.tagLabel}>Confidence</span> {sourceConfidenceLabel(src.confidence)}
                  </span>
                )}
                {src.conviction && (
                  <span className={s.tag}>
                    <span className={s.tagLabel}>Conviction</span> {convictionLabel(src.conviction)}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
