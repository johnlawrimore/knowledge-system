'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import LinkChip from '@/components/LinkChip';
import InlineEdit from '@/components/InlineEdit';
import EvalSection, { DimensionGrid } from '@/components/EvalSection';
import { claimTypeLabel, stanceLabel, strengthLabel, evidenceTypeLabel, deviceTypeLabel, contextTypeLabel, methodTypeLabel, reasoningTypeLabel } from '@/lib/enumLabels';
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

interface ClaimSource {
  id: number;
  title: string;
  source_type: string;
}

interface Device {
  id: number;
  content: string;
  device_type: string;
  effectiveness_note: string | null;
  source_id: number;
  source_title: string;
}

interface Context {
  id: number;
  content: string;
  context_type: string;
  source_id: number;
  source_title: string;
}

interface Method {
  id: number;
  content: string;
  method_type: string;
  source_id: number;
  source_title: string;
}

interface Reasoning {
  id: number;
  content: string;
  reasoning_type: string;
  source_id: number;
  source_title: string;
}

interface ClaimEvaluation {
  validity?: Record<string, number>;
  substance?: Record<string, number>;
  evaluated_at?: string;
}

interface ChildClaim {
  id: number;
  statement: string;
  claim_type: string;
  computed_confidence: string;
  score: number;
}

interface ClaimDetail {
  id: number;
  statement: string;
  claim_type: string;
  parent_claim_id: number | null;
  parent_claim: ChildClaim | null;
  children: ChildClaim[];
  reviewer_notes: string | null;
  notes: string | null;
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
  sources: ClaimSource[];
  evidence: Evidence[];
  devices: Device[];
  contexts: Context[];
  methods: Method[];
  reasonings: Reasoning[];
  relationships: Relationship[];
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

      {claim.parent_claim && (
        <div className={s.parentSection}>
          <div className={s.metaLabel}>Parent Claim</div>
          <Link href={`/claims/${claim.parent_claim.id}`} className={s.parentLink}>
            <span className={s.claimId}>#{claim.parent_claim.id}</span>
            <span className={s.claimType}>{claimTypeLabel(claim.parent_claim.claim_type)}</span>
            <ConfidenceBadge confidence={claim.parent_claim.computed_confidence} score={claim.parent_claim.score} />
            <span className={s.parentStatement}>{claim.parent_claim.statement}</span>
          </Link>
        </div>
      )}

      {claim.children.length > 0 && (
        <div className={s.childrenSection}>
          <div className={s.metaLabel}>Child Claims ({claim.children.length})</div>
          <div className={s.childList}>
            {claim.children.map((child) => (
              <Link key={child.id} href={`/claims/${child.id}`} className={s.childItem}>
                <span className={s.claimId}>#{child.id}</span>
                <span className={s.claimType}>{claimTypeLabel(child.claim_type)}</span>
                <ConfidenceBadge confidence={child.computed_confidence} score={child.score} />
                <span className={s.childStatement}>{child.statement}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

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

      {claim.sources.length > 0 && (
        <>
          <hr className={s.divider} />
          <div className={s.sectionTitle}>Sources ({claim.sources.length})</div>
          <div className={s.entityList}>
            {claim.sources.map((src) => (
              <Link key={src.id} href={`/sources?id=${src.id}`} className={s.entityChip}>
                {src.title}
              </Link>
            ))}
          </div>
        </>
      )}

      {claim.devices.length > 0 && (
        <>
          <hr className={s.divider} />
          <div className={s.sectionTitle}>Devices ({claim.devices.length})</div>
          <div className={s.entityCardList}>
            {claim.devices.map((d) => (
              <div key={d.id} className={s.entityCard}>
                <div className={s.entityCardHeader}>
                  <span className={s.entityTypeBadge}>{deviceTypeLabel(d.device_type)}</span>
                </div>
                <div className={s.entityCardContent}>{d.content}</div>
                {d.effectiveness_note && (
                  <div className={s.entityCardNote}>Effectiveness: {d.effectiveness_note}</div>
                )}
                <div className={s.entityCardSource}>
                  Source: <Link href={`/sources?id=${d.source_id}`}>{d.source_title}</Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {claim.contexts.length > 0 && (
        <>
          <hr className={s.divider} />
          <div className={s.sectionTitle}>Contexts ({claim.contexts.length})</div>
          <div className={s.entityCardList}>
            {claim.contexts.map((c) => (
              <div key={c.id} className={s.entityCard}>
                <div className={s.entityCardHeader}>
                  <span className={s.entityTypeBadge}>{contextTypeLabel(c.context_type)}</span>
                </div>
                <div className={s.entityCardContent}>{c.content}</div>
                <div className={s.entityCardSource}>
                  Source: <Link href={`/sources?id=${c.source_id}`}>{c.source_title}</Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {claim.methods.length > 0 && (
        <>
          <hr className={s.divider} />
          <div className={s.sectionTitle}>Methods ({claim.methods.length})</div>
          <div className={s.entityCardList}>
            {claim.methods.map((m) => (
              <div key={m.id} className={s.entityCard}>
                <div className={s.entityCardHeader}>
                  <span className={s.entityTypeBadge}>{methodTypeLabel(m.method_type)}</span>
                </div>
                <div className={s.entityCardContent}>{m.content}</div>
                <div className={s.entityCardSource}>
                  Source: <Link href={`/sources?id=${m.source_id}`}>{m.source_title}</Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {claim.reasonings.length > 0 && (
        <>
          <hr className={s.divider} />
          <div className={s.sectionTitle}>Reasonings ({claim.reasonings.length})</div>
          <div className={s.entityCardList}>
            {claim.reasonings.map((r) => (
              <div key={r.id} className={s.entityCard}>
                <div className={s.entityCardHeader}>
                  <span className={s.entityTypeBadge}>{reasoningTypeLabel(r.reasoning_type)}</span>
                </div>
                <div className={s.entityCardContent}>{r.content}</div>
                <div className={s.entityCardSource}>
                  Source: <Link href={`/sources?id=${r.source_id}`}>{r.source_title}</Link>
                </div>
              </div>
            ))}
          </div>
        </>
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

    </div>
  );
}
