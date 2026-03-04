'use client';
import Link from 'next/link';
import { CompositionDetail as CompositionDetailType } from '@/lib/types';
import SourceTypeBadge from '@/components/SourceTypeBadge';
import MarkdownViewer from '@/components/MarkdownViewer';
import { compositionStatusLabel } from '@/lib/enumLabels';
import s from '../shared.module.scss';
import ps from './page.module.scss';

interface CompositionDetailProps {
  detail: CompositionDetailType;
  onPatch: (field: string, value: string) => Promise<void>;
}

export default function CompositionDetailView({
  detail,
  onPatch,
}: CompositionDetailProps) {
  return (
    <>
      <div className={s.detailTitle}>{detail.title}</div>
      <div className={ps.detailMeta}>
        {detail.word_count?.toLocaleString()} words
        {' \u00B7 '}
        <span className={ps.statusBadge}>{compositionStatusLabel(detail.status)}</span>
        {' \u00B7 '}
        {detail.claim_count} claims
      </div>

      {detail.sources.length > 0 && (
        <div className={s.detailSection}>
          <div className={s.detailLabel}>
            Sources ({detail.sources.length})
          </div>
          <div className={ps.linkedList}>
            {detail.sources.map((src) => (
              <div key={src.id} className={ps.sourceRow}>
                <Link
                  href={`/sources?id=${src.id}`}
                  className={ps.linkedItem}
                >
                  {src.title}
                </Link>
                <SourceTypeBadge type={src.source_type} size={13} />
                {src.contribution_note && (
                  <span className={ps.contributionNote}>
                    {src.contribution_note}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {detail.evaluation_results && (
        <div className={s.detailSection}>
          <div className={s.detailLabel}>Evaluation Results</div>
          <div className={ps.evalBlock}>
            {JSON.stringify(detail.evaluation_results, null, 2)}
          </div>
        </div>
      )}

      <div className={s.detailSection}>
        <div className={s.detailLabel}>Content</div>
        <MarkdownViewer content={detail.content} />
      </div>
    </>
  );
}
