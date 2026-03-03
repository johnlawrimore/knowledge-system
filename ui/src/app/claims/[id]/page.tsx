'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import LinkChip from '@/components/LinkChip';
import InlineEdit from '@/components/InlineEdit';
import EvalSection, { DimensionGrid } from '@/components/EvalSection';
import { claimTypeLabel, stanceLabel, strengthLabel, evidenceTypeLabel } from '@/lib/enumLabels';
import s from './page.module.scss';

interface Evidence {
  id: number;
  content: string;
  evidence_type: string;
  verbatim_quote: string | null;
  stance: string;
  strength: string;
  reasoning: string | null;
  source_id: number;
  source_title: string;
  source_type: string;
  credibility: number | null;
  contributors: string;
}

interface Relationship {
  id: number;
  related_claim_id: number;
  related_statement: string;
  relationship: string;
  direction: string;
}

interface ClaimEvaluation {
  validity?: Record<string, number>;
  substance?: Record<string, number>;
  evaluated_at?: string;
}

interface ClaimDetail {
  id: number;
  statement: string;
  claim_type: string;
  reviewer_notes: string | null;
  notes: string | null;
  cluster_id: number | null;
  evaluation_results: ClaimEvaluation | null;
  created_at: string;
  updated_at: string;
  computed_confidence: string;
  score: number;
  supporting_sources: number;
  contradicting_sources: number;
  topics: { id: number; name: string }[];
  themes: { id: number; name: string }[];
  tags: string[];
  evidence: Evidence[];
  relationships: Relationship[];
  cluster: {
    id: number;
    summary: string | null;
    reviewer_notes: string | null;
    siblings: { id: number; statement: string }[];
  } | null;
}

const stanceStyles: Record<string, { card: string; badge: string }> = {
  supports: { card: s.evidenceSupports, badge: s.stanceSupports },
  contradicts: { card: s.evidenceContradicts, badge: s.stanceContradicts },
  qualifies: { card: s.evidenceQualifies, badge: s.stanceQualifies },
};

export default function ClaimDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch(`/api/claims/${id}`)
      .then((r) => r.json())
      .then(setClaim)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const patchClaim = async (field: string, value: string) => {
    await fetch(`/api/claims/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    load();
  };

  const removeTopic = async (topicId: number) => {
    await fetch(`/api/claims/${id}/topics/${topicId}`, { method: 'DELETE' });
    load();
  };

  const removeTheme = async (themeId: number) => {
    await fetch(`/api/claims/${id}/themes/${themeId}`, { method: 'DELETE' });
    load();
  };

  const removeTag = async (tag: string) => {
    await fetch(`/api/claims/${id}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' });
    load();
  };

  if (loading) return <div className={s.loading}>Loading claim...</div>;
  if (!claim) return <div className={s.empty}>Claim not found</div>;

  return (
    <div className={s.page}>
      <button onClick={() => router.back()} className={s.backLink}>
        &larr; Back
      </button>

      <div className={s.claimHeader}>
        <span className={s.claimId}>CLAIM #{claim.id}</span>
        <span className={s.claimType}>{claimTypeLabel(claim.claim_type)}</span>
        <ConfidenceBadge confidence={claim.computed_confidence} score={claim.score} />
      </div>

      <div className={s.statementBox}>
        <InlineEdit
          value={claim.statement}
          onSave={(v) => patchClaim('statement', v)}
          multiline
          placeholder="Claim statement..."
        />
      </div>

      {claim.evaluation_results && (claim.evaluation_results.validity || claim.evaluation_results.substance) && (
        <EvalSection label="Claim Evaluation" evaluatedAt={claim.evaluation_results.evaluated_at}>
          {claim.evaluation_results.validity && (
            <DimensionGrid label="Validity" dimensions={claim.evaluation_results.validity} columns={3} />
          )}
          {claim.evaluation_results.substance && (
            <DimensionGrid label="Substance" dimensions={claim.evaluation_results.substance} columns={3} />
          )}
        </EvalSection>
      )}

      <div className={s.notesSection}>
        <div className={s.metaLabel}>Reviewer Notes</div>
        <InlineEdit
          value={claim.reviewer_notes}
          onSave={(v) => patchClaim('reviewer_notes', v)}
          multiline
          placeholder="Add reviewer notes..."
        />
      </div>

      <div className={s.metaGrid}>
        <div className={s.metaSection}>
          <div className={s.metaLabel}>Topics</div>
          <div className={s.chipRow}>
            {claim.topics.map((t) => (
              <LinkChip
                key={t.id}
                href={`/topics?id=${t.id}`}
                label={t.name}
                kind="topic"
                onRemove={() => removeTopic(t.id)}
              />
            ))}
            <button className={s.addBtn}>+ Add</button>
          </div>
        </div>

        <div className={s.metaSection}>
          <div className={s.metaLabel}>Themes</div>
          <div className={s.chipRow}>
            {claim.themes.map((t) => (
              <LinkChip
                key={t.id}
                href={`/themes?id=${t.id}`}
                label={t.name}
                kind="theme"
                onRemove={() => removeTheme(t.id)}
              />
            ))}
            <button className={s.addBtn}>+ Add</button>
          </div>
        </div>
      </div>

      <div className={s.metaSection}>
        <div className={s.metaLabel}>Tags</div>
        <div className={s.chipRow}>
          {claim.tags.map((t) => (
            <LinkChip key={t} label={t} kind="tag" onRemove={() => removeTag(t)} />
          ))}
          <button className={s.addBtn}>+ Add</button>
        </div>
      </div>

      <hr className={s.divider} />

      <div className={s.sectionTitle}>Evidence ({claim.evidence.length})</div>
      {claim.evidence.length === 0 ? (
        <div className={s.empty}>No evidence yet — this claim needs sources</div>
      ) : (
        <div className={s.evidenceList}>
          {claim.evidence.map((ev) => {
            const ss = stanceStyles[ev.stance] || stanceStyles.supports;
            return (
              <div key={ev.id} className={`${s.evidenceCard} ${ss.card}`}>
                <div className={s.evidenceHeader}>
                  <span className={`${s.stanceBadge} ${ss.badge}`}>{stanceLabel(ev.stance)}</span>
                  <span>&middot;</span>
                  <span>{strengthLabel(ev.strength)}</span>
                  <span>&middot;</span>
                  <span>{evidenceTypeLabel(ev.evidence_type)}</span>
                  {ev.credibility != null && (
                    <>
                      <span>&middot;</span>
                      <span>credibility {ev.credibility}</span>
                    </>
                  )}
                </div>
                <div className={s.evidenceContent}>{ev.content}</div>
                {ev.reasoning && (
                  <div className={s.evidenceReasoning}>
                    Reasoning: {ev.reasoning}
                  </div>
                )}
                <div className={s.evidenceSource}>
                  Source: <Link href={`/sources?id=${ev.source_id}`}>{ev.source_title}</Link>
                  {ev.contributors && ` (${ev.contributors})`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {claim.relationships.length > 0 && (
        <>
          <hr className={s.divider} />
          <div className={s.sectionTitle}>Relationships</div>
          <div className={s.relList}>
            {claim.relationships.map((r) => (
              <div key={r.id} className={s.relItem}>
                <span className={s.relType}>{r.relationship} &rarr;</span>
                <Link href={`/claims/${r.related_claim_id}`} className={s.relClaim}>
                  #{r.related_claim_id}: {r.related_statement}
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      {claim.cluster && (
        <>
          <hr className={s.divider} />
          <div className={s.sectionTitle}>Cluster</div>
          <div className={s.clusterBox}>
            <div className={s.clusterTitle}>
              Cluster #{claim.cluster.id}
              {claim.cluster.summary && `: ${claim.cluster.summary}`}
            </div>
            {!claim.cluster.summary && (
              <div className={s.clusterMeta}>Summary not yet written</div>
            )}
            {claim.cluster.siblings.length > 0 && (
              <div className={s.siblingList}>
                <div className={s.metaLabel}>Also in this cluster</div>
                {claim.cluster.siblings.map((sib) => (
                  <Link key={sib.id} href={`/claims/${sib.id}`} className={s.siblingItem}>
                    <div>#{sib.id}: {sib.statement}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
