'use client';

import LinkChip from '@/components/LinkChip';
import InlineEdit from '@/components/InlineEdit';
import DetailSection from '@/components/DetailSection';
import EvalSection, { DimensionGrid } from '@/components/EvalSection';
import KeyBadge from '@/components/KeyBadge';
import SourceLinkList from '@/components/SourceLinkList';
import type { ClaimDetail, ClaimSource } from '@/lib/types';
import shared from '../../../shared.module.scss';
import s from '../page.module.scss';

interface ClaimAboutProps {
  claim: ClaimDetail;
  patchClaim: (field: string, value: string) => Promise<void>;
  onRemoveTopic: (topicId: number) => void;
  onRemoveTheme: (themeId: number) => void;
  onRemoveTag: (tag: string) => void;
}

export default function ClaimAbout({
  claim,
  patchClaim,
  onRemoveTopic,
  onRemoveTheme,
  onRemoveTag,
}: ClaimAboutProps) {
  return (
    <>
      {claim.sources.length > 0 && (
        <div className={shared.box}>
          <DetailSection label="Sources" count={claim.sources.length}>
            <SourceLinkList
              sources={claim.sources}
              renderExtra={(src: ClaimSource) => src.is_key ? <KeyBadge /> : null}
            />
          </DetailSection>
        </div>
      )}

      <div className={shared.boxGrid}>
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

      <div className={shared.boxGrid}>
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
