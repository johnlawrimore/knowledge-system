'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import LinkChip from '@/components/LinkChip';
import s from './page.module.scss';

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

const SORTS = [
  { key: 'score', label: 'Score' },
  { key: 'newest', label: 'Newest' },
  { key: 'sources', label: 'Sources' },
  { key: 'alpha', label: 'A-Z' },
];

const PAGE_SIZE = 25;

export default function ClaimsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter state from URL params
  const confidence = searchParams.get('confidence') || '';
  const type = searchParams.get('type') || '';
  const topic = searchParams.get('topic') || '';
  const theme = searchParams.get('theme') || '';
  const tag = searchParams.get('tag') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'score';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const setFilter = useCallback(
    (key: string, val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) params.set(key, val);
      else params.delete(key);
      if (key !== 'page') params.set('page', '1');
      router.push(`/claims?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (confidence) params.set('confidence', confidence);
    if (type) params.set('type', type);
    if (topic) params.set('topic', topic);
    if (theme) params.set('theme', theme);
    if (tag) params.set('tag', tag);
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
  }, [confidence, type, topic, theme, tag, search, sort, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Claims</h1>
      </div>

      <div className={s.filters}>
        <select className={s.select} value={confidence} onChange={(e) => setFilter('confidence', e.target.value)}>
          <option value="">All confidence</option>
          <option value="strong">Strong</option>
          <option value="moderate">Moderate</option>
          <option value="developing">Developing</option>
          <option value="contested">Contested</option>
          <option value="unsupported">Unsupported</option>
        </select>

        <select className={s.select} value={type} onChange={(e) => setFilter('type', e.target.value)}>
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
          onChange={(e) => setFilter('search', e.target.value)}
        />
      </div>

      <div className={s.sortBar}>
        <span>Sort:</span>
        {SORTS.map((st) => (
          <button
            key={st.key}
            className={sort === st.key ? s.sortBtnActive : s.sortBtn}
            onClick={() => setFilter('sort', st.key)}
          >
            {st.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={s.loading}>Loading claims...</div>
      ) : claims.length === 0 ? (
        <div className={s.empty}>No claims found</div>
      ) : (
        <>
          <div className={s.list}>
            {claims.map((c) => (
              <Link key={c.id} href={`/claims/${c.id}`} className={s.claimRow}>
                <div className={s.claimHeader}>
                  <span className={s.claimId}>#{c.id}</span>
                  <span className={s.claimType}>{c.claim_type}</span>
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

          <div className={s.pagination}>
            <span>{total} claims total</span>
            <div>
              <button
                className={s.pageBtn}
                disabled={page <= 1}
                onClick={() => setFilter('page', String(page - 1))}
              >
                Prev
              </button>
              <span style={{ margin: '0 0.5rem' }}>
                {page} / {totalPages}
              </span>
              <button
                className={s.pageBtn}
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
