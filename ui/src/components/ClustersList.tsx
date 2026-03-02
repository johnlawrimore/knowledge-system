'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import InlineEdit from '@/components/InlineEdit';
import LinkChip from '@/components/LinkChip';
import s from './ClustersList.module.scss';

interface ClusterListItem {
  id: number;
  summary: string | null;
  reviewer_notes: string | null;
  claim_count: number;
  computed_confidence: string;
  score: number;
  supporting_sources: number;
  contradicting_sources: number;
}

interface ClusterClaim {
  id: number;
  statement: string;
  claim_type: string;
  reviewer_notes: string | null;
  created_at: string;
}

interface ClusterDetail extends ClusterListItem {
  total_supporting_evidence: number;
  total_contradicting_evidence: number;
  total_qualifying_evidence: number;
  total_reasoning_count: number;
  claims: ClusterClaim[];
  evidence_stats: { stance: string; strength: string; count: number }[];
}

export default function ClustersList() {
  const [clusters, setClusters] = useState<ClusterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ClusterDetail | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/clusters')
      .then((r) => r.json())
      .then((d) => setClusters(d.clusters || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    fetch(`/api/clusters/${id}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(console.error);
  };

  const patchCluster = async (id: number, field: string, value: string) => {
    await fetch(`/api/clusters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    const [listRes, detailRes] = await Promise.all([
      fetch('/api/clusters'),
      fetch(`/api/clusters/${id}`),
    ]);
    const listData = await listRes.json();
    const detailData = await detailRes.json();
    setClusters(listData.clusters || []);
    setDetail(detailData);
  };

  if (loading) return <div className={s.loading}>Loading clusters...</div>;
  if (clusters.length === 0) return <div className={s.empty}>No clusters found</div>;

  return (
    <div className={s.cardList}>
      {clusters.map((cl) => {
        const isExpanded = expandedId === cl.id;
        return (
          <div key={cl.id} className={s.card}>
            <div
              onClick={() => loadDetail(cl.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className={s.cardTitle}>
                Cluster #{cl.id}
                {'  '}
                <ConfidenceBadge
                  confidence={cl.computed_confidence}
                  score={cl.score}
                />
              </div>

              {cl.summary ? (
                <div className={s.cardBody}>{cl.summary}</div>
              ) : (
                <div className={s.noSummary}>
                  Not yet summarized — click to expand and write a summary
                </div>
              )}

              <div className={s.cardMeta}>
                {cl.claim_count} claim{cl.claim_count !== 1 ? 's' : ''}
                {' · '}
                {cl.supporting_sources} supporting source{cl.supporting_sources !== 1 ? 's' : ''}
                {cl.contradicting_sources > 0 && (
                  <> · {cl.contradicting_sources} contradicting</>
                )}
              </div>
            </div>

            {isExpanded && (
              <div>
                <hr className={s.divider} />

                <div className={s.section}>
                  <div className={s.sectionLabel}>Summary</div>
                  <InlineEdit
                    value={cl.summary}
                    onSave={(v) => patchCluster(cl.id, 'summary', v)}
                    multiline
                    placeholder="Write a summary for this cluster..."
                  />
                </div>

                <div className={s.section}>
                  <div className={s.sectionLabel}>Reviewer Notes</div>
                  <InlineEdit
                    value={cl.reviewer_notes}
                    onSave={(v) => patchCluster(cl.id, 'reviewer_notes', v)}
                    multiline
                    placeholder="Add reviewer notes..."
                  />
                </div>

                {detail === null ? (
                  <div className={s.loading}>Loading claims...</div>
                ) : (
                  <div className={s.section}>
                    <div className={s.sectionLabel}>
                      Member Claims ({detail.claims.length})
                    </div>
                    {detail.claims.length === 0 ? (
                      <div className={s.emptyInline}>No claims in this cluster</div>
                    ) : (
                      <div className={s.claimList}>
                        {detail.claims.map((claim) => (
                          <Link
                            key={claim.id}
                            href={`/claims/${claim.id}`}
                            className={s.claimRow}
                          >
                            <span className={s.claimId}>
                              #{claim.id} · {claim.claim_type}
                            </span>
                            {' '}
                            <span className={s.claimStatement}>
                              {claim.statement}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {detail && detail.evidence_stats.length > 0 && (
                  <div className={s.section}>
                    <div className={s.sectionLabel}>Evidence Breakdown</div>
                    <div className={s.chipRow}>
                      {detail.evidence_stats.map((es, i) => (
                        <LinkChip
                          key={i}
                          label={`${es.stance} / ${es.strength}: ${es.count}`}
                          kind={es.stance === 'supports' ? 'topic' : es.stance === 'contradicts' ? 'tag' : 'theme'}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
