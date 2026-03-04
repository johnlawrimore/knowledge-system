'use client';

import Link from 'next/link';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import DetailSection from '@/components/DetailSection';
import InlineEdit from '@/components/InlineEdit';
import InlineComboBox from '@/components/InlineComboBox';
import { TopicDetail, TopicNode, ClaimRow } from '@/lib/types';
import s from '../shared.module.scss';

function flattenTopics(nodes: TopicNode[], depth = 0): { id: number; name: string; depth: number }[] {
  const result: { id: number; name: string; depth: number }[] = [];
  for (const n of nodes) {
    result.push({ id: n.id, name: n.name, depth });
    result.push(...flattenTopics(n.children, depth + 1));
  }
  return result;
}

function ClaimSection({ title, claims }: { title: string; claims: ClaimRow[] }) {
  if (claims.length === 0) return null;
  return (
    <DetailSection label={title}>
      <div className={s.claimList}>
        {claims.map((c) => (
          <Link key={c.id} href={`/claims/${c.id}`} className={s.claimRow}>
            <span className={s.claimScore}>
              <ConfidenceBadge confidence={c.computed_confidence} score={c.score} />
            </span>{' '}
            <span className={s.claimStatement}>{c.statement}</span>
          </Link>
        ))}
      </div>
    </DetailSection>
  );
}

export default function TopicDetailPanel({
  detail,
  topics,
  onUpdate,
}: {
  detail: TopicDetail;
  topics: TopicNode[];
  onUpdate: () => void;
}) {
  const patch = async (field: string, value: string | number | null) => {
    await fetch(`/api/topics/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    onUpdate();
  };

  // Build parent suggestions excluding self and descendants
  const allFlat = flattenTopics(topics);
  const selfAndDescendants = new Set<number>();
  const collectDescendants = (nodes: TopicNode[], collecting: boolean) => {
    for (const n of nodes) {
      if (n.id === detail.id || collecting) {
        selfAndDescendants.add(n.id);
        collectDescendants(n.children, true);
      } else {
        collectDescendants(n.children, false);
      }
    }
  };
  collectDescendants(topics, false);
  const parentSuggestions = allFlat
    .filter((t) => !selfAndDescendants.has(t.id))
    .map((t) => t.name);

  const handleParentSave = async (val: string) => {
    if (!val || val === 'None') {
      await patch('parent_topic_id', null);
      return;
    }
    const match = allFlat.find((t) => t.name === val);
    if (match) {
      await patch('parent_topic_id', match.id);
    }
  };

  return (
    <>
      <DetailSection label="Name">
        <InlineEdit
          value={detail.name}
          onSave={(v) => patch('name', v)}
          placeholder="Topic name..."
        />
      </DetailSection>

      <DetailSection label="Description">
        <InlineEdit
          value={detail.description}
          onSave={(v) => patch('description', v)}
          multiline
          placeholder="Click to add description..."
        />
      </DetailSection>

      <DetailSection label="Parent Topic">
        <InlineComboBox
          value={detail.parent_name}
          onSave={handleParentSave}
          suggestions={['None', ...parentSuggestions]}
          placeholder="None (top-level)"
        />
      </DetailSection>

      <DetailSection label="Statistics">
        <div className={s.detailValue}>
          {detail.claims.length} claims
          {detail.source_count > 0 && <> &middot; {detail.source_count} sources</>}
          {detail.avg_claim_score != null && (
            <> &middot; avg score: {Number(detail.avg_claim_score).toFixed(1)}</>
          )}
        </div>
      </DetailSection>

      <hr className={s.divider} />

      <ClaimSection title="Strongest Claims" claims={detail.strongest} />

      {detail.claims.length > 0 && (
        <div className={s.detailSection}>
          <Link
            href={`/claims?topic=${detail.id}`}
            style={{ fontSize: '0.8125rem', color: 'var(--accent-blue)' }}
          >
            All {detail.claims.length} claims →
          </Link>
        </div>
      )}
    </>
  );
}
