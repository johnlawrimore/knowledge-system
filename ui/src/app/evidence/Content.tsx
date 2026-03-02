'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SourceTypeBadge from '@/components/SourceTypeBadge';
import { evidenceTypeLabel, stanceLabel, strengthLabel } from '@/lib/enumLabels';
import { pageIcon } from '@/lib/pageIcons';
import s from '../shared.module.scss';

const EvidenceIcon = pageIcon('evidence');
import ps from './page.module.scss';

interface EvidenceListItem {
  id: number;
  content: string;
  source_id: number;
  evidence_type: string;
  verbatim_quote: string | null;
  evaluation_results: Record<string, unknown> | null;
  derived_from_evidence_id: number | null;
  notes: string | null;
  created_at: string;
  source_title: string;
  claim_count: number;
}

interface LinkedClaim {
  id: number;
  statement: string;
  stance: string;
  strength: string;
  reasoning: string | null;
}

interface DerivedChainItem {
  id: number;
  content: string;
  evidence_type: string;
  derived_from_evidence_id: number | null;
  source_title: string;
}

interface EvidenceDetail {
  id: number;
  content: string;
  source_id: number;
  evidence_type: string;
  verbatim_quote: string | null;
  evaluation_results: Record<string, unknown> | null;
  derived_from_evidence_id: number | null;
  notes: string | null;
  created_at: string;
  source_title: string;
  source_type: string;
  source_url: string | null;
  claims: LinkedClaim[];
  derived_chain: DerivedChainItem[];
}

const PAGE_SIZE = 25;

function stanceClass(stance: string): string {
  switch (stance) {
    case 'supports':
      return ps.stanceSupports;
    case 'contradicts':
      return ps.stanceContradicts;
    case 'qualifies':
      return ps.stanceQualifies;
    default:
      return ps.stanceBadge;
  }
}

export default function EvidenceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [evidence, setEvidence] = useState<EvidenceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedDetail, setExpandedDetail] = useState<EvidenceDetail | null>(
    null
  );
  const [loadingDetail, setLoadingDetail] = useState(false);

  const selectedId = searchParams.get('id');
  const evidenceType = searchParams.get('evidence_type') || '';
  const stance = searchParams.get('stance') || '';
  const strength = searchParams.get('strength') || '';
  const sourceId = searchParams.get('source_id') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const setFilter = useCallback(
    (key: string, val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) params.set(key, val);
      else params.delete(key);
      if (key !== 'page' && key !== 'id') params.set('page', '1');
      router.push(`/evidence?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (evidenceType) params.set('evidence_type', evidenceType);
    if (stance) params.set('stance', stance);
    if (strength) params.set('strength', strength);
    if (sourceId) params.set('source_id', sourceId);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String((page - 1) * PAGE_SIZE));

    fetch(`/api/evidence?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setEvidence(d.evidence || []);
        setTotal(d.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [evidenceType, stance, strength, sourceId, page]);

  useEffect(() => {
    if (!selectedId) {
      setExpandedDetail(null);
      return;
    }
    setLoadingDetail(true);
    fetch(`/api/evidence/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setExpandedDetail(d))
      .catch(console.error)
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  const handleRowClick = (id: number) => {
    if (String(id) === selectedId) {
      setFilter('id', '');
    } else {
      setFilter('id', String(id));
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}><EvidenceIcon size={32} stroke={2} className={s.pageIcon} />Evidence</h1>
      </div>

      <div className={s.filters}>
        <select
          className={s.select}
          value={evidenceType}
          onChange={(e) => setFilter('evidence_type', e.target.value)}
        >
          <option value="">All types</option>
          <option value="quote">Quote</option>
          <option value="data">Data</option>
          <option value="example">Example</option>
          <option value="anecdote">Anecdote</option>
          <option value="citation">Citation</option>
          <option value="reasoning">Reasoning</option>
          <option value="other">Other</option>
        </select>

        <select
          className={s.select}
          value={stance}
          onChange={(e) => setFilter('stance', e.target.value)}
        >
          <option value="">All stances</option>
          <option value="supports">Supports</option>
          <option value="contradicts">Contradicts</option>
          <option value="qualifies">Qualifies</option>
        </select>

        <select
          className={s.select}
          value={strength}
          onChange={(e) => setFilter('strength', e.target.value)}
        >
          <option value="">All strengths</option>
          <option value="strong">Strong</option>
          <option value="moderate">Moderate</option>
          <option value="weak">Weak</option>
        </select>

        {sourceId && (
          <button
            className={s.actionBtn}
            onClick={() => setFilter('source_id', '')}
          >
            Source #{sourceId} &times;
          </button>
        )}
      </div>

      {loading ? (
        <div className={s.loading}>Loading evidence...</div>
      ) : evidence.length === 0 ? (
        <div className={s.empty}>No evidence found</div>
      ) : (
        <>
          <div className={ps.list}>
            {evidence.map((ev) => {
              const isExpanded = String(ev.id) === selectedId;
              return (
                <div
                  key={ev.id}
                  className={isExpanded ? ps.evidenceRowActive : ps.evidenceRow}
                  onClick={() => handleRowClick(ev.id)}
                >
                  <div className={ps.rowHeader}>
                    <span className={ps.evidenceId}>#{ev.id}</span>
                    <span className={ps.typeBadge}>{evidenceTypeLabel(ev.evidence_type)}</span>
                    {ev.derived_from_evidence_id && (
                      <span className={ps.typeBadge}>Derived</span>
                    )}
                  </div>
                  <div className={ps.contentPreview}>
                    {ev.content.length > 200
                      ? ev.content.slice(0, 200) + '...'
                      : ev.content}
                  </div>
                  <div className={ps.rowMeta}>
                    <span className={ps.sourceLabel}>
                      {ev.source_title}
                    </span>
                    {' \u00B7 '}
                    <span className={ps.claimCountLabel}>
                      {ev.claim_count} claim{ev.claim_count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {isExpanded && (
                    <div
                      className={ps.expandedDetail}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {loadingDetail ? (
                        <div className={s.loading}>Loading details...</div>
                      ) : expandedDetail ? (
                        <>
                          <div className={ps.detailSection}>
                            <div className={ps.detailLabel}>Full Content</div>
                            <div className={ps.detailValue}>
                              {expandedDetail.content}
                            </div>
                          </div>

                          {expandedDetail.verbatim_quote && (
                            <div className={ps.detailSection}>
                              <div className={ps.detailLabel}>
                                Verbatim Quote
                              </div>
                              <div className={ps.quoteBlock}>
                                {expandedDetail.verbatim_quote}
                              </div>
                            </div>
                          )}

                          <div className={ps.detailSection}>
                            <div className={ps.detailLabel}>Source</div>
                            <Link
                              href={`/sources?id=${expandedDetail.source_id}`}
                              className={s.cardLink}
                            >
                              {expandedDetail.source_title}
                            </Link>
                            {expandedDetail.source_type && (
                              <span className={ps.strengthLabel}>
                                {' \u00B7 '}
                                <SourceTypeBadge type={expandedDetail.source_type} size={13} />
                              </span>
                            )}
                          </div>

                          {expandedDetail.claims.length > 0 && (
                            <div className={ps.detailSection}>
                              <div className={ps.detailLabel}>
                                Linked Claims ({expandedDetail.claims.length})
                              </div>
                              <div className={ps.claimList}>
                                {expandedDetail.claims.map((c) => (
                                  <div key={c.id} className={ps.claimRow}>
                                    <Link
                                      href={`/claims/${c.id}`}
                                      className={ps.claimStatement}
                                    >
                                      #{c.id}: {c.statement}
                                    </Link>
                                    <span className={stanceClass(c.stance)}>
                                      {stanceLabel(c.stance)}
                                    </span>
                                    <span className={ps.strengthLabel}>
                                      {strengthLabel(c.strength)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {expandedDetail.derived_chain.length > 0 && (
                            <div className={ps.detailSection}>
                              <div className={ps.detailLabel}>
                                Derived From Chain
                              </div>
                              <div className={ps.derivedChain}>
                                {expandedDetail.derived_chain.map((d) => (
                                  <div key={d.id} className={ps.derivedItem}>
                                    <div className={ps.derivedItemType}>
                                      #{d.id} &middot; {evidenceTypeLabel(d.evidence_type)}
                                    </div>
                                    <div className={ps.derivedItemContent}>
                                      {d.content.length > 300
                                        ? d.content.slice(0, 300) + '...'
                                        : d.content}
                                    </div>
                                    <div className={ps.derivedItemSource}>
                                      {d.source_title}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {expandedDetail.evaluation_results && (
                            <div className={ps.detailSection}>
                              <div className={ps.detailLabel}>
                                Evaluation Results
                              </div>
                              <div className={ps.evalBlock}>
                                {JSON.stringify(
                                  expandedDetail.evaluation_results,
                                  null,
                                  2
                                )}
                              </div>
                            </div>
                          )}

                          {expandedDetail.notes && (
                            <div className={ps.detailSection}>
                              <div className={ps.detailLabel}>Notes</div>
                              <div className={ps.detailValue}>
                                {expandedDetail.notes}
                              </div>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className={ps.pagination}>
            <span>{total} evidence items total</span>
            <div>
              <button
                className={ps.pageBtn}
                disabled={page <= 1}
                onClick={() => setFilter('page', String(page - 1))}
              >
                Prev
              </button>
              <span className={ps.strengthLabel}>
                {' '}
                {page} / {totalPages}{' '}
              </span>
              <button
                className={ps.pageBtn}
                disabled={page >= totalPages}
                onClick={() => setFilter('page', String(page + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
