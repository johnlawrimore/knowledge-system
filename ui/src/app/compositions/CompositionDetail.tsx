'use client';
import { CompositionDetail as CompositionDetailType } from '@/lib/types';
import MarkdownViewer from '@/components/MarkdownViewer';
import DetailSection from '@/components/DetailSection';
import EvalSection, { DimensionGrid } from '@/components/EvalSection';
import SourceLinkList from '@/components/SourceLinkList';
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
        <DetailSection label="Sources" count={detail.sources.length}>
          <SourceLinkList
            sources={detail.sources}
            renderExtra={(src) =>
              src.contribution_note ? (
                <span className={ps.contributionNote}>{src.contribution_note}</span>
              ) : null
            }
          />
        </DetailSection>
      )}

      {detail.evaluation_results && (
        <EvalSection
          label="AI Evaluation"
          evaluatedAt={detail.evaluation_results.evaluated_at}
          notes={detail.evaluation_results.evaluation_notes}
        >
          <DimensionGrid
            dimensions={{
              'Quality': detail.evaluation_results.quality ?? null,
              'Completeness': detail.evaluation_results.completeness ?? null,
              'Voice': detail.evaluation_results.voice_consistency ?? null,
              'Readiness': detail.evaluation_results.decomposition_readiness ?? null,
            }}
            columns={4}
          />
        </EvalSection>
      )}

      <DetailSection label="Content">
        <MarkdownViewer content={detail.content} />
      </DetailSection>
    </>
  );
}
