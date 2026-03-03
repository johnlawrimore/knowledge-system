'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import LinkChip from '@/components/LinkChip';
import MultiSelectDropdown, { FlatOption } from '@/components/MultiSelectDropdown';
import { claimTypeLabel } from '@/lib/enumLabels';
import s from './ClaimsList.module.scss';

interface Claim {
  id: number;
  statement: string;
  claim_type: string;
  cluster_id: number | null;
  computed_confidence: string;
  score: number;
  supporting_sources: number;
  contradicting_sources: number;
  supporting_evidence: number;
  contradicting_evidence: number;
  qualifying_evidence: number;
  topics: string[];
  themes: string[];
  tags: string[];
  cluster_summary: string | null;
}

interface TopicNode {
  id: number;
  name: string;
  parent_topic_id: number | null;
  children: TopicNode[];
}

function flattenTree(nodes: TopicNode[], depth = 0, parentId: number | null = null): FlatOption[] {
  const result: FlatOption[] = [];
  for (const node of nodes) {
    const childIds = node.children.map((c) => c.id);
    result.push({ id: node.id, name: node.name, depth, parentId, childIds });
    result.push(...flattenTree(node.children, depth + 1, node.id));
  }
  return result;
}

const SORTS = [
  { key: 'score', label: 'Score' },
  { key: 'newest', label: 'Newest' },
  { key: 'sources', label: 'Sources' },
  { key: 'alpha', label: 'A-Z' },
];

const PAGE_SIZE = 25;

interface ClaimsListProps {
  sourceId?: number;
  showFilters?: boolean;
}

export default function ClaimsList({ sourceId, showFilters = true }: ClaimsListProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [confidence, setConfidence] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('score');
  const [page, setPage] = useState(1);
  const [topicOptions, setTopicOptions] = useState<FlatOption[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (showFilters) {
      fetch('/api/topics')
        .then((r) => r.json())
        .then((d) => setTopicOptions(flattenTree(d.topics || [])))
        .catch(console.error);
    }
  }, [showFilters]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (sourceId) params.set('source_id', String(sourceId));
    if (confidence) params.set('confidence', confidence);
    if (type) params.set('type', type);
    if (selectedTopics.size > 0) params.set('topic', [...selectedTopics].join(','));
    if (search) params.set('search', search);
    params.set('sort', sort);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String((page - 1) * PAGE_SIZE));

    fetch(`/api/claims?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setClaims(d.data || d.claims || []);
        setTotal(d.pagination?.total ?? d.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sourceId, confidence, type, selectedTopics, search, sort, page]);

  // Reset page when filters change
  const updateFilter = (setter: (v: string) => void, val: string) => {
    setter(val);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading) return <div className={s.loading}>Loading claims...</div>;
  if (claims.length === 0 && !confidence && !type && !search) {
    return <div className={s.empty}>No claims found</div>;
  }

  return (
    <div className={s.wrapper}>
      {showFilters && (
        <>
          <div className={s.filters}>
            <MultiSelectDropdown
              label="Topics"
              options={topicOptions}
              selected={selectedTopics}
              onChange={(sel) => { setSelectedTopics(sel); setPage(1); }}
            />

            <select className={s.select} value={confidence} onChange={(e) => updateFilter(setConfidence, e.target.value)}>
              <option value="">All confidence</option>
              <option value="strong">Strong</option>
              <option value="moderate">Moderate</option>
              <option value="developing">Developing</option>
              <option value="contested">Contested</option>
              <option value="unsupported">Unsupported</option>
            </select>

            <select className={s.select} value={type} onChange={(e) => updateFilter(setType, e.target.value)}>
              <option value="">All types</option>
              <option value="assertion">Assertion</option>
              <option value="principle">Principle</option>
              <option value="framework">Framework</option>
              <option value="recommendation">Recommendation</option>
              <option value="prediction">Prediction</option>
              <option value="definition">Definition</option>
              <option value="observation">Observation</option>
            </select>

            <input
              className={s.searchInput}
              type="text"
              placeholder="Search claims..."
              value={search}
              onChange={(e) => updateFilter(setSearch, e.target.value)}
            />
          </div>

          <div className={s.sortBar}>
            <span>Sort:</span>
            {SORTS.map((st) => (
              <button
                key={st.key}
                className={sort === st.key ? s.sortBtnActive : s.sortBtn}
                onClick={() => { setSort(st.key); setPage(1); }}
              >
                {st.label}
              </button>
            ))}
          </div>
        </>
      )}

      {claims.length === 0 ? (
        <div className={s.empty}>No claims match filters</div>
      ) : (
        <>
          <div className={s.list}>
            {claims.map((c) => (
              <Link key={c.id} href={`/claims/${c.id}`} className={s.claimRow}>
                <div className={s.claimHeader}>
                  <span className={s.claimId}>#{c.id}</span>
                  <span className={s.claimType}>{claimTypeLabel(c.claim_type)}</span>
                  <ConfidenceBadge confidence={c.computed_confidence} score={c.score} />
                </div>
                <div className={s.claimStatement}>{c.statement}</div>
                <div className={s.claimMeta}>
                  <span className={s.evidenceSummary}>
                    {c.supporting_sources} sources &middot; {c.supporting_evidence + c.contradicting_evidence + c.qualifying_evidence} evidence
                    {c.contradicting_sources > 0 && ` · ${c.contradicting_sources} contradictions`}
                  </span>
                </div>
                {(c.topics?.length > 0 || c.tags?.length > 0) && (
                  <div className={s.chipRow}>
                    {c.topics?.map((t) => (
                      <LinkChip key={`t-${t}`} label={t} kind="topic" />
                    ))}
                    {c.tags?.map((t) => (
                      <LinkChip key={`tag-${t}`} label={t} kind="tag" />
                    ))}
                  </div>
                )}
                {c.contradicting_sources >= 2 && (
                  <div className={s.contestedAlert}>
                    ! {c.contradicting_sources} contradicting sources — review needed
                  </div>
                )}
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={s.pagination}>
              <span>{total} claims total</span>
              <div>
                <button
                  className={s.pageBtn}
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Prev
                </button>
                <span style={{ margin: '0 0.5rem' }}>
                  {page} / {totalPages}
                </span>
                <button
                  className={s.pageBtn}
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
