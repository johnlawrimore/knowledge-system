'use client';

import Link from 'next/link';
import LinkChip from '@/components/LinkChip';
import InlineEdit from '@/components/InlineEdit';
import DetailSection from '@/components/DetailSection';
import EvalSection, { DimensionGrid } from '@/components/EvalSection';
import type { ClaimDetail } from '@/lib/types';
import s from '../page.module.scss';

interface ClaimAboutTabProps {
  claim: ClaimDetail;
  patchClaim: (field: string, value: string) => Promise<void>;
  onRemoveTopic: (topicId: number) => void;
  onRemoveTheme: (themeId: number) => void;
  onRemoveTag: (tag: string) => void;
}

export default function ClaimAboutTab({
  claim,
  patchClaim,
  onRemoveTopic,
  onRemoveTheme,
  onRemoveTag,
}: ClaimAboutTabProps) {
  return (
    <>
      {claim.sources.length > 0 && (
        <DetailSection label="Sources" count={claim.sources.length}>
          <div className={s.chipRow}>
            {claim.sources.map((src) => (
              <Link key={src.id} href={`/sources?id=${src.id}`} className={s.sourceChip}>
                {src.title}
              </Link>
            ))}
          </div>
        </DetailSection>
      )}

      <div className={s.taxonomyBox}>
        <div>
          <DetailSection label="Topics">
            <div className={s.chipRow}>
              {claim.topics.map((t) => (
                <LinkChip
                  key={t.id}
                  href={`/topics?id=${t.id}`}
                  label={t.name}
                  kind="topic"
                  onRemove={() => onRemoveTopic(t.id)}
                />
              ))}
              <button className={s.addBtn}>+ Add</button>
            </div>
          </DetailSection>

          <DetailSection label="Tags">
            <div className={s.chipRow}>
              {claim.tags.map((t) => (
                <LinkChip key={t} label={t} kind="tag" onRemove={() => onRemoveTag(t)} />
              ))}
              <button className={s.addBtn}>+ Add</button>
            </div>
          </DetailSection>
        </div>

        <DetailSection label="Themes">
          <div className={s.chipRow}>
            {claim.themes.map((t) => (
              <LinkChip
                key={t.id}
                href={`/themes?id=${t.id}`}
                label={t.name}
                kind="theme"
                onRemove={() => onRemoveTheme(t.id)}
              />
            ))}
            <button className={s.addBtn}>+ Add</button>
          </div>
        </DetailSection>
      </div>

      {claim.evaluation_results && (claim.evaluation_results.validity || claim.evaluation_results.substance) && (
        <EvalSection label="Claim Evaluation" row>
          {claim.evaluation_results.validity && (
            <DimensionGrid label="Validity" dimensions={claim.evaluation_results.validity} columns={3} />
          )}
          {claim.evaluation_results.substance && (
            <DimensionGrid label="Substance" dimensions={claim.evaluation_results.substance} columns={3} />
          )}
        </EvalSection>
      )}

      <div className={s.notesGrid}>
        <DetailSection label="Notes">
          <InlineEdit
            value={claim.notes}
            onSave={(v) => patchClaim('notes', v)}
            multiline
            placeholder="Add notes..."
          />
        </DetailSection>
        <DetailSection label="Reviewer Notes">
          <InlineEdit
            value={claim.reviewer_notes}
            onSave={(v) => patchClaim('reviewer_notes', v)}
            multiline
            placeholder="Add reviewer notes..."
          />
        </DetailSection>
      </div>
    </>
  );
}
