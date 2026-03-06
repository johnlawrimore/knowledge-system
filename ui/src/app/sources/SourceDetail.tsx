'use client';

import { useState } from 'react';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import InlineEdit from '@/components/InlineEdit';
import InlineComboBox from '@/components/InlineComboBox';
import MarkdownViewer from '@/components/MarkdownViewer';
import ClaimsList from '@/components/ClaimsList';
import LinkedList from '@/components/LinkedList';
import DetailSection from '@/components/DetailSection';
import SourceTypeBadge from '@/components/SourceTypeBadge';
import MetaLine from '@/components/MetaLine';
import GradeBadge from '@/components/GradeBadge';
import EvalSection, { DimensionGrid } from '@/components/EvalSection';
import Tabs from '@/components/Tabs';
import Avatar from '@/components/Avatar';
import ConfirmDialog from '@/components/ConfirmDialog';
import Tooltip from '@/components/Tooltip';
import SourceExplorerTab from './SourceExplorerTab';
import { contributorRoleLabel } from '@/lib/enumLabels';
import { formatDate } from '@/lib/formatDate';
import { formatLabel } from '@/lib/sourceTypes';
import { SourceDetail as SourceDetailType } from '@/lib/types';
import s from './page.module.scss';

interface SourceDetailProps {
  detail: SourceDetailType;
  publicationNames: string[];
  onPatch: (field: string, value: string) => Promise<void>;
  onDiscard: () => void;
}

const BASE_TABS = [
  { key: 'about', label: 'About' },
  { key: 'explorer', label: 'Explorer' },
  { key: 'distillation', label: 'Distillation' },
  { key: 'original', label: 'Original Text' },
  { key: 'claims', label: 'Claims' },
];

export default function SourceDetailView({
  detail,
  publicationNames,
  onPatch,
  onDiscard,
}: SourceDetailProps) {
  const [contentTab, setContentTab] = useState<string>('about');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const tabs = BASE_TABS.map((t) => {
    if (t.key === 'original') {
      return { ...t, label: detail.format === 'transcript' ? 'Original Transcript' : 'Original Text' };
    }
    if (t.key === 'claims' && detail.claims_count > 0) {
      return { ...t, count: detail.claims_count };
    }
    return t;
  });

  return (
    <>
      <div className={s.detailHeader}>
        <div className={s.detailTitle}>{detail.title}</div>
        {detail.status !== 'decomposed' && <span className={s.processingBadge}>Processing</span>}
      </div>
      <MetaLine>
        <SourceTypeBadge type={detail.source_type} size={16} />
        {detail.publication && <span>{detail.publication}</span>}
        <strong>{formatDate(detail.published_date)}</strong>
        <span>{detail.word_count?.toLocaleString()} words</span>
        {detail.contributors.length > 0 && <strong>{detail.contributors[0].name}</strong>}
      </MetaLine>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Tabs tabs={tabs} active={contentTab} onChange={setContentTab} />
        {detail.created_at && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Collected {formatDate(detail.created_at)}
          </span>
        )}
      </div>

      {contentTab === 'about' ? (
        <div className={s.tabContent}>
          <div className={s.fieldGrid}>
            {detail.contributors.length > 0 && (
              <DetailSection label="Contributors">
                {detail.contributors.map((c) => (
                  <div key={c.id} className={s.contributorRow}>
                    <Avatar name={c.name} url={c.avatar} size={24} />
                    <Link href={`/contributors?id=${c.id}`}>{c.name}</Link>
                    {c.affiliation && <span>({c.affiliation})</span>}
                    <span className={s.contributorRole}>{contributorRoleLabel(c.contributor_role)}</span>
                  </div>
                ))}
              </DetailSection>
            )}

            <DetailSection label="Publication">
              <InlineComboBox
                value={detail.publication}
                onSave={(v) => onPatch('publication', v)}
                suggestions={publicationNames}
                placeholder="Add publication..."
              />
            </DetailSection>
          </div>

          {detail.url && (
            <DetailSection label="Source URL">
              <a href={detail.url} target="_blank" rel="noopener noreferrer" className={s.linkedItem}>
                {detail.url}
              </a>
            </DetailSection>
          )}

          {detail.summary && (
            <DetailSection label="Summary">
              <span>{detail.summary}</span>
            </DetailSection>
          )}

          {detail.key_claims.length > 0 && (
            <DetailSection label="Key Claims" count={detail.key_claims.length}>
              {detail.key_claims.map((c) => (
                <div key={c.id} className={s.keyClaim}>
                  <Link href={`/claims?id=${c.id}`}>{c.statement}</Link>
                </div>
              ))}
            </DetailSection>
          )}

          <DetailSection label="Curation Rule">
            {detail.curation_rule ? (
              <div className={s.detailValue} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                {detail.curation_rule.name}
                <span style={{ color: 'var(--text-muted)' }}>
                  v{detail.curation_rule.version}
                </span>
                {detail.curation_rule.description && <Tooltip text={detail.curation_rule.description} />}
              </div>
            ) : (
              <div className={s.detailValue} style={{ color: 'var(--text-muted)' }}>
                None
              </div>
            )}
          </DetailSection>

          {detail.evaluation_results?.grade && (
            <EvalSection
              label="Source Evaluation"
              headerRight={<GradeBadge grade={detail.evaluation_results.grade} />}
              notes={detail.evaluation_results.grade_notes}
            >
              {detail.evaluation_results.quality && (
                <DimensionGrid label="Quality" dimensions={detail.evaluation_results.quality} columns={4} />
              )}
              {detail.evaluation_results.rigor && (
                <DimensionGrid label="Rigor" dimensions={detail.evaluation_results.rigor} columns={4} />
              )}
            </EvalSection>
          )}



          {detail.compositions.count > 0 && (
            <DetailSection label="Compositions" count={detail.compositions.count}>
              <LinkedList items={detail.compositions.items.map((a) => ({ id: a.id, title: a.title, href: `/compositions?id=${a.id}` }))} />
            </DetailSection>
          )}

          <hr className={s.divider} />
          <div className={s.discardSection}>
            {!confirmDiscard ? (
              <button className={s.discardBtn} onClick={() => setConfirmDiscard(true)}>
                Discard Source
              </button>
            ) : (
              <ConfirmDialog
                message="This will permanently remove this source and all its evidence, devices, contexts, methods, and reasonings. Claims will not be deleted but will lose their link to this source."
                confirmLabel="Yes, Discard Source"
                onConfirm={onDiscard}
                onCancel={() => setConfirmDiscard(false)}
                variant="danger"
              />
            )}
          </div>
        </div>
      ) : contentTab === 'explorer' ? (
        <SourceExplorerTab
          sourceId={detail.id}
          sourceTitle={detail.title}
          sourceType={detail.source_type}
        />
      ) : contentTab === 'distillation' ? (
        detail.distillation ? (
          <MarkdownViewer content={detail.distillation} />
        ) : (
          <EmptyState message="No distillation available" variant="tab" />
        )
      ) : contentTab === 'original' ? (
        <MarkdownViewer content={detail.original} />
      ) : (
        <ClaimsList sourceId={detail.id} showFilters={false} />
      )}
    </>
  );
}
