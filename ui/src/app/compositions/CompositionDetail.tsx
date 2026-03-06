'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CompositionDetail as CompositionDetailType } from '@/lib/types';
import MarkdownViewer from '@/components/MarkdownViewer';
import DetailSection from '@/components/DetailSection';
import EvalSection, { DimensionGrid } from '@/components/EvalSection';
import SourceLinkList from '@/components/SourceLinkList';
import { compositionStatusLabel } from '@/lib/enumLabels';
import s from '../shared.module.scss';
import ps from './page.module.scss';

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor'), { ssr: false });

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

      <ContentEditor content={detail.content} onSave={(v) => onPatch('content', v)} />
    </>
  );
}

function ContentEditor({ content, onSave }: { content: string | null; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content || '');
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setDraft(content || '');
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(content || '');
    setEditing(false);
  };

  if (!editing) {
    return (
      <DetailSection label="Content">
        <div onClick={handleEdit} className={ps.contentClickable}>
          {content ? <MarkdownViewer content={content} /> : <span className={ps.contentPlaceholder}>Click to add content...</span>}
        </div>
      </DetailSection>
    );
  }

  return (
    <DetailSection label="Content">
      <MarkdownEditor value={draft} onChange={setDraft} placeholder="Write content..." />
      <div className={ps.contentActions}>
        <button onClick={handleSave} disabled={saving} className={ps.saveBtn}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={handleCancel} className={ps.cancelBtn}>Cancel</button>
      </div>
    </DetailSection>
  );
}
