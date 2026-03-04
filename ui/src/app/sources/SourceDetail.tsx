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
import StanceStats from '@/components/StanceStats';
import ConfirmDialog from '@/components/ConfirmDialog';
import { contributorRoleLabel } from '@/lib/enumLabels';
import { formatDate } from '@/lib/formatDate';
import { SourceDetail as SourceDetailType } from '@/lib/types';
import s from './page.module.scss';

interface SourceDetailProps {
  detail: SourceDetailType;
  publicationNames: string[];
  onPatch: (field: string, value: string) => Promise<void>;
  onDiscard: () => void;
}

const TABS = [
  { key: 'about', label: 'About' },
  { key: 'distillation', label: 'Distillation' },
  { key: 'original', label: 'Original' },
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

  const tabs = TABS.map((t) =>
    t.key === 'claims' && detail.claims_count > 0
      ? { ...t, count: detail.claims_count }
      : t
  );

  return (
    <>
      <div className={s.detailTitle}>{detail.title}</div>
      <MetaLine>
        <SourceTypeBadge type={detail.source_type} size={16} />
        {detail.publication && <span>{detail.publication}</span>}
        <strong>{formatDate(detail.published_date)}</strong>
        <span>{detail.word_count?.toLocaleString()} words</span>
        {detail.contributors.length > 0 && <strong>{detail.contributors[0].name}</strong>}
      </MetaLine>

      <Tabs tabs={tabs} active={contentTab} onChange={setContentTab} />

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

          <DetailSection label="Description">
            <InlineEdit
              value={detail.description}
              onSave={(v) => onPatch('description', v)}
              multiline
              placeholder="Add description..."
            />
          </DetailSection>

          <DetailSection label="Content Filter">
            {detail.content_filter ? (
              <>
                <div className={s.detailValue}>
                  {detail.content_filter.name}
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.375rem' }}>
                    v{detail.content_filter.version}
                  </span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.375rem', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
                  {detail.content_filter.instructions}
                </div>
              </>
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
              notes={detail.evaluation_results.bias_notes}
            >
              {detail.evaluation_results.quality && (
                <DimensionGrid label="Quality" dimensions={detail.evaluation_results.quality} columns={4} />
              )}
              {detail.evaluation_results.rigor && (
                <DimensionGrid label="Rigor" dimensions={detail.evaluation_results.rigor} columns={4} />
              )}
            </EvalSection>
          )}

          {detail.evidence.total > 0 && (
            <DetailSection label="Evidence" count={detail.evidence.total}>
              <StanceStats
                supports={detail.evidence.byStance.supports}
                contradicts={detail.evidence.byStance.contradicts}
                qualifies={detail.evidence.byStance.qualifies}
              />
            </DetailSection>
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
