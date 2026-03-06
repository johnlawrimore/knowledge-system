'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import KeyBadge from '@/components/KeyBadge';
import LinkChip from '@/components/LinkChip';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import { Claim, TopicNode, FlatOption } from '@/lib/types';
import { claimTypeLabel } from '@/lib/enumLabels';
import s from './ClaimsList.module.scss';

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
  initialTopicId?: number;
}

// Recursive component to render a claim and its children
function ClaimNode({
  claim,
  depth,
}: {
  claim: Claim;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const [children, setChildren] = useState<Claim[] | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(false);

  const hasChildren = claim.child_count > 0;

  const loadChildren = useCallback(() => {
    if (children !== null) return;
    setLoadingChildren(true);
    fetch(`/api/claims?parent_id=${claim.id}&sort=score&limit=100`)
      .then((r) => r.json())
      .then((d) => setChildren(d.data || []))
      .catch(console.error)
      .finally(() => setLoadingChildren(false));
  }, [claim.id, children]);

  const toggleExpanded = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!expanded) {
      loadChildren();
    }
    setExpanded(!expanded);
  };

  // Auto-load children on mount if has children
  useEffect(() => {
    if (hasChildren && children === null) {
      loadChildren();
    }
  }, [hasChildren, children, loadChildren]);

  return (
    <div className={depth > 0 ? s.childGroup : undefined}>
      <div className={s.claimRow}>
        <Link href={`/claims/${claim.id}`} className={s.claimLink}>
          <div className={s.claimHeader}>
            <div className={s.claimHeaderLeft}>
              <span className={s.claimId}>#{claim.id}</span>
              <span className={s.claimType}>{claimTypeLabel(claim.claim_type)}</span>
              {!!claim.is_key && <KeyBadge />}
              {hasChildren && (
                <button
                  className={s.expandBtn}
                  onClick={toggleExpanded}
                  title={expanded ? 'Collapse children' : 'Expand children'}
                >
                  {expanded ? '\u25BC' : '\u25B6'} {claim.child_count} child{claim.child_count !== 1 ? 'ren' : ''}
                </button>
              )}
            </div>
            <ConfidenceBadge confidence={claim.computed_confidence} score={claim.score} />
          </div>
          <div className={s.claimStatement}>{claim.statement}</div>
          <div className={s.claimMeta}>
            <span className={s.evidenceSummary}>
              {claim.supporting_sources} sources &middot; {claim.supporting_evidence + claim.contradicting_evidence + claim.qualifying_evidence} evidence
              {claim.device_count > 0 && ` · ${claim.device_count} device${claim.device_count !== 1 ? 's' : ''}`}
              {claim.context_count > 0 && ` · ${claim.context_count} context${claim.context_count !== 1 ? 's' : ''}`}
              {claim.method_count > 0 && ` · ${claim.method_count} method${claim.method_count !== 1 ? 's' : ''}`}
              {claim.reasoning_count > 0 && ` · ${claim.reasoning_count} reasoning${claim.reasoning_count !== 1 ? 's' : ''}`}
              {claim.contradicting_sources > 0 && ` · ${claim.contradicting_sources} contradictions`}
            </span>
          </div>
          {claim.topics?.length > 0 && (
            <div className={s.chipRow}>
              {claim.topics.map((t) => (
                <LinkChip key={`t-${t}`} label={t} kind="topic" />
              ))}
            </div>
          )}
          {claim.contradicting_sources >= 2 && (
            <div className={s.contestedAlert}>
              ! {claim.contradicting_sources} contradicting sources — review needed
            </div>
          )}
        </Link>
      </div>

      {hasChildren && expanded && (
        <div className={s.childrenContainer}>
          {loadingChildren && <div className={s.loadingChildren}>Loading...</div>}
          {children?.map((child) => (
            <ClaimNode key={child.id} claim={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClaimsList({ sourceId, showFilters = true, initialTopicId }: ClaimsListProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [confidence, setConfidence] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('score');
  const [page, setPage] = useState(1);
  const [topicOptions, setTopicOptions] = useState<FlatOption[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set(initialTopicId ? [initialTopicId] : []));

  const hasActiveFilters = !!(confidence || type || search || selectedTopics.size > 0);

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

  // When filters are active, claims come flat (parents + children mixed).
  // Group them into trees: top-level first, children nested under parents.
  const organizedClaims = (() => {
    if (!hasActiveFilters) {
      // No filters — API already returns only top-level claims
      return claims;
    }

    // With filters, claims may include both parents and children.
    // Build a map and organize into trees.
    const byId = new Map<number, Claim>();
    claims.forEach((c) => byId.set(c.id, c));

    // Find root-level claims for display (no parent, or parent not in result set)
    const roots: Claim[] = [];
    const childrenOf = new Map<number, Claim[]>();

    for (const c of claims) {
      if (c.parent_claim_id && byId.has(c.parent_claim_id)) {
        const siblings = childrenOf.get(c.parent_claim_id) || [];
        siblings.push(c);
        childrenOf.set(c.parent_claim_id, siblings);
      } else {
        roots.push(c);
      }
    }

    // For roots that have children in the result set, set child_count so they render expandable
    // The children are already loaded inline, so we override them
    return roots.map((r) => ({
      ...r,
      _inlineChildren: childrenOf.get(r.id) || undefined,
    }));
  })();

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
              <option value="recommendation">Recommendation</option>
              <option value="prediction">Prediction</option>
              <option value="definition">Definition</option>
              <option value="observation">Observation</option>
              <option value="mechanism">Mechanism</option>
              <option value="distinction">Distinction</option>
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
            {organizedClaims.map((c) => (
              <ClaimNode key={c.id} claim={c} depth={0} />
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
