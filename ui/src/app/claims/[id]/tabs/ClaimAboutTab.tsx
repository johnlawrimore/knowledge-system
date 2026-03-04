'use client';

import Link from 'next/link';
import LinkChip from '@/components/LinkChip';
import InlineEdit from '@/components/InlineEdit';
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
      <div className={s.aboutGrid}>
        <div className={s.aboutSection}>
          <div className={s.metaLabel}>Topics</div>
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
        </div>

        <div className={s.aboutSection}>
          <div className={s.metaLabel}>Themes</div>
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
        </div>

        <div className={s.aboutSection}>
          <div className={s.metaLabel}>Tags</div>
          <div className={s.chipRow}>
            {claim.tags.map((t) => (
              <LinkChip key={t} label={t} kind="tag" onRemove={() => onRemoveTag(t)} />
            ))}
            <button className={s.addBtn}>+ Add</button>
          </div>
        </div>

        {claim.sources.length > 0 && (
          <div className={s.aboutSection}>
            <div className={s.metaLabel}>Sources ({claim.sources.length})</div>
            <div className={s.chipRow}>
              {claim.sources.map((src) => (
                <Link key={src.id} href={`/sources?id=${src.id}`} className={s.sourceChip}>
                  {src.title}
                </Link>
              ))}
            </div>
          </div>
        )}
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
        <div className={s.aboutSection}>
          <div className={s.metaLabel}>Reviewer Notes</div>
          <InlineEdit
            value={claim.reviewer_notes}
            onSave={(v) => patchClaim('reviewer_notes', v)}
            multiline
            placeholder="Add reviewer notes..."
          />
        </div>
        <div className={s.aboutSection}>
          <div className={s.metaLabel}>Notes</div>
          <InlineEdit
            value={claim.notes}
            onSave={(v) => patchClaim('notes', v)}
            multiline
            placeholder="Add notes..."
          />
        </div>
      </div>
    </>
  );
}
