'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import LinkChip from '@/components/LinkChip';
import InlineEdit from '@/components/InlineEdit';
import EvalSection, { DimensionGrid } from '@/components/EvalSection';
import StrengthMeter from '@/components/StrengthMeter';
import ClaimGraph from '@/components/ClaimGraph';
import { claimTypeLabel, stanceLabel, evidenceTypeLabel, deviceTypeLabel, contextTypeLabel, methodTypeLabel, reasoningTypeLabel } from '@/lib/enumLabels';
import s from './page.module.scss';

interface Evidence {
  id: number;
  content: string;
  evidence_type: string;
  verbatim_quote: string | null;
  stance: string;
  strength: number | null;
  strength_notes: string | null;
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
  related_claim_type: string;
  related_confidence: string | null;
  related_score: number | null;
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
  evidence_id: number;
  claim_id: number;
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

type Tab = 'about' | 'connections' | 'evidence' | 'devices' | 'contexts' | 'methods';

const stanceStyles: Record<string, { card: string; badge: string }> = {
  supporting:    { card: s.evidenceSupports,    badge: s.stanceSupports },
  contradicting: { card: s.evidenceContradicts, badge: s.stanceContradicts },
  qualifying:    { card: s.evidenceQualifies,   badge: s.stanceQualifies },
};

export default function ClaimDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('about');

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

  // Group reasonings by evidence_id for nesting under evidence cards
  const reasoningsByEvidence = claim.reasonings.reduce<Record<number, Reasoning[]>>((acc, r) => {
    if (!acc[r.evidence_id]) acc[r.evidence_id] = [];
    acc[r.evidence_id].push(r);
    return acc;
  }, {});

  const connectionsCount =
    (claim.parent_claim ? 1 : 0) + claim.children.length + claim.relationships.length;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'about', label: 'About', count: 0 },
    { key: 'connections', label: 'Connected Claims', count: connectionsCount },
    { key: 'evidence', label: 'Evidence', count: claim.evidence.length },
    { key: 'devices', label: 'Rhetorical Devices', count: claim.devices.length },
    { key: 'contexts', label: 'Contexts', count: claim.contexts.length },
    { key: 'methods', label: 'Application', count: claim.methods.length },
  ];

  return (
    <div className={s.page}>
      {/* ── Hero: just the claim identity ──────────────────────────── */}
      <button onClick={() => router.back()} className={s.backLink}>
        &larr; Back
      </button>

      <div className={s.claimHeader}>
        <span className={s.claimId}>CLAIM #{claim.id}</span>
        <span className={s.claimType}>{claimTypeLabel(claim.claim_type)}</span>
        <ConfidenceBadge confidence={claim.computed_confidence} score={claim.score} />
      </div>

      <blockquote className={s.statementBox}>
        <InlineEdit
          value={claim.statement}
          onSave={(v) => patchClaim('statement', v)}
          multiline
          placeholder="Claim statement..."
        />
      </blockquote>

      {/* ── Tab bar ────────────────────────────────────────────────── */}
      <div className={s.contentTabs}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? s.contentTabActive : s.contentTab}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.count > 0 && <span className={s.tabBadge}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────────────────── */}
      <div className={s.tabContent}>

        {tab === 'about' && (
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
                      onRemove={() => removeTopic(t.id)}
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
                      onRemove={() => removeTheme(t.id)}
                    />
                  ))}
                  <button className={s.addBtn}>+ Add</button>
                </div>
              </div>

              <div className={s.aboutSection}>
                <div className={s.metaLabel}>Tags</div>
                <div className={s.chipRow}>
                  {claim.tags.map((t) => (
                    <LinkChip key={t} label={t} kind="tag" onRemove={() => removeTag(t)} />
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
        )}

        {tab === 'connections' && (
          <>
            {connectionsCount > 0 ? (
              <ClaimGraph
                focalId={claim.id}
                focalStatement={claim.statement}
                focalType={claim.claim_type}
                focalConfidence={claim.computed_confidence}
                focalScore={claim.score}
                parent={claim.parent_claim}
                children={claim.children}
                relationships={claim.relationships}
              />
            ) : (
              <div className={s.emptyTab}>No connections — this claim has no parent, children, or relationships</div>
            )}

            {/* Old list view — kept for reference, delete when graph is stable
            {claim.parent_claim && (
              <div className={s.connectionGroup}>
                <div className={s.metaLabel}>Parent Claim</div>
                <div className={s.connectionList}>
                  <Link href={`/claims/${claim.parent_claim.id}`} className={s.connectionCard}>
                    <div className={s.connectionTopRow}>
                      <span className={s.claimType}>{claimTypeLabel(claim.parent_claim.claim_type)}</span>
                      <span className={s.claimId}>#{claim.parent_claim.id}</span>
                    </div>
                    <span className={s.connectionStatement}>{claim.parent_claim.statement}</span>
                  </Link>
                </div>
              </div>
            )}

            {claim.children.length > 0 && (
              <div className={s.connectionGroup}>
                <div className={s.metaLabel}>Child Claims ({claim.children.length})</div>
                <div className={s.connectionList}>
                  {claim.children.map((child) => (
                    <Link key={child.id} href={`/claims/${child.id}`} className={s.connectionCard}>
                      <div className={s.connectionTopRow}>
                        <span className={s.claimType}>{claimTypeLabel(child.claim_type)}</span>
                        <span className={s.claimId}>#{child.id}</span>
                      </div>
                      <span className={s.connectionStatement}>{child.statement}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {claim.relationships.length > 0 && (
              <div className={s.connectionGroup}>
                <div className={s.metaLabel}>Relationships ({claim.relationships.length})</div>
                <div className={s.connectionList}>
                  {claim.relationships.map((r) => (
                    <Link key={r.id} href={`/claims/${r.related_claim_id}`} className={s.connectionCard}>
                      <div className={s.connectionTopRow}>
                        <span className={s.relBadge}>{relationshipLabel(r.relationship)}</span>
                        <span className={s.claimId}>#{r.related_claim_id}</span>
                      </div>
                      <span className={s.connectionStatement}>{r.related_statement}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            */}
          </>
        )}

        {tab === 'evidence' && (
          <>
            {claim.evidence.length === 0 ? (
              <div className={s.emptyTab}>No evidence yet — this claim needs sources</div>
            ) : (
              <div className={s.cardList}>
                {claim.evidence.map((ev) => {
                  const ss = stanceStyles[ev.stance] || stanceStyles.supporting;
                  return (
                    <div key={ev.id} className={`${s.evidenceCard} ${ss.card}`}>
                      <div className={s.evidenceHeader}>
                        <div className={s.evidenceHeaderLeft}>
                          <span>{evidenceTypeLabel(ev.evidence_type)}</span>
                          <span>&middot;</span>
                          <span className={`${s.stanceBadge} ${ss.badge}`}>{stanceLabel(ev.stance)}</span>
                        </div>
                        {ev.strength != null && (
                          <StrengthMeter strength={ev.strength} notes={ev.strength_notes} />
                        )}
                      </div>
                      <div className={s.cardContent}>{ev.content}</div>
                      {reasoningsByEvidence[ev.id] && reasoningsByEvidence[ev.id].length > 0 && (
                        <>
                          <div className={s.reasoningHeader}>Reasoning</div>
                          {reasoningsByEvidence[ev.id].map((r) => (
                            <div key={r.id} className={s.cardNote}>
                              <span className={s.reasoningType}>{reasoningTypeLabel(r.reasoning_type)}</span>
                              {r.content}
                            </div>
                          ))}
                        </>
                      )}
                      <div className={s.cardSource}>
                        Source: <Link href={`/sources?id=${ev.source_id}`}>{ev.source_title}</Link>
                        {ev.contributors && ` (${ev.contributors})`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'devices' && (
          <>
            {claim.devices.length === 0 ? (
              <div className={s.emptyTab}>No devices linked to this claim</div>
            ) : (
              <div className={s.cardList}>
                {claim.devices.map((d) => (
                  <div key={d.id} className={s.entityCard}>
                    <div className={s.entityCardHeader}>
                      <span className={s.entityTypeBadge}>{deviceTypeLabel(d.device_type)}</span>
                    </div>
                    <div className={s.cardContent}>{d.content}</div>
                    {d.effectiveness_note && (
                      <div className={s.cardNote}>Effectiveness: {d.effectiveness_note}</div>
                    )}
                    <div className={s.cardSource}>
                      Source: <Link href={`/sources?id=${d.source_id}`}>{d.source_title}</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'contexts' && (
          <>
            {claim.contexts.length === 0 ? (
              <div className={s.emptyTab}>No contexts linked to this claim</div>
            ) : (
              <div className={s.cardList}>
                {claim.contexts.map((c) => (
                  <div key={c.id} className={s.entityCard}>
                    <div className={s.entityCardHeader}>
                      <span className={s.entityTypeBadge}>{contextTypeLabel(c.context_type)}</span>
                    </div>
                    <div className={s.cardContent}>{c.content}</div>
                    <div className={s.cardSource}>
                      Source: <Link href={`/sources?id=${c.source_id}`}>{c.source_title}</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'methods' && (
          <>
            {claim.methods.length === 0 ? (
              <div className={s.emptyTab}>No methods linked to this claim</div>
            ) : (
              <div className={s.cardList}>
                {claim.methods.map((m) => (
                  <div key={m.id} className={s.entityCard}>
                    <div className={s.entityCardHeader}>
                      <span className={s.entityTypeBadge}>{methodTypeLabel(m.method_type)}</span>
                    </div>
                    <div className={s.cardContent}>{m.content}</div>
                    <div className={s.cardSource}>
                      Source: <Link href={`/sources?id=${m.source_id}`}>{m.source_title}</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
