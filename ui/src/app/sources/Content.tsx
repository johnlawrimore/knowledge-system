'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import InlineEdit from '@/components/InlineEdit';
import MarkdownViewer from '@/components/MarkdownViewer';
import ClaimsList from '@/components/ClaimsList';
import SourceTypeBadge from '@/components/SourceTypeBadge';
import { SOURCE_TYPES } from '@/lib/sourceTypes';
import { contributorRoleLabel } from '@/lib/enumLabels';
import { formatDate } from '@/lib/formatDate';
import { pageIcon } from '@/lib/pageIcons';
import s from './page.module.scss';

const SourcesIcon = pageIcon('sources');

interface SourceListItem {
  id: number;
  title: string;
  source_type: string;
  publication: string | null;
  word_count: number;
  status: string;
  date_collected: string;
  main_contributor: string | null;
}

interface SourceDetail {
  id: number;
  title: string;
  source_type: string;
  url: string | null;
  publication: string | null;
  publication_date: string | null;
  word_count: number;
  status: string;
  notes: string | null;
  evaluation_results: Record<string, unknown> | null;
  content_preview: string;
  original: string;
  content_has_more: boolean;
  distillation: string | null;
  contributors: { id: number; name: string; affiliation: string; avatar: string | null; contributor_role: string }[];
  compositions: { count: number; items: { id: number; title: string; status: string }[] };
  evidence: { total: number; byStance: Record<string, number> };
  claims_count: number;
}

export default function SourcesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sources, setSources] = useState<SourceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SourceDetail | null>(null);
  const [contentTab, setContentTab] = useState<'about' | 'distillation' | 'original' | 'claims'>('about');

  const selectedId = searchParams.get('id');
  const status = searchParams.get('status') || '';
  const type = searchParams.get('type') || '';
  const search = searchParams.get('search') || '';

  const setFilter = useCallback(
    (key: string, val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) params.set(key, val);
      else params.delete(key);
      router.push(`/sources?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    if (search) params.set('search', search);
    params.set('limit', '100');

    fetch(`/api/sources?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setSources(d.sources || []);
        setTotal(d.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status, type, search]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    fetch(`/api/sources/${selectedId}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch(console.error);
  }, [selectedId]);

  const patchSource = async (field: string, value: string) => {
    if (!selectedId) return;
    await fetch(`/api/sources/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    const r = await fetch(`/api/sources/${selectedId}`);
    setDetail(await r.json());
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}><SourcesIcon size={32} stroke={2} className={s.pageIcon} />Sources</h1>
      </div>

      <div className={s.filters}>
        <select className={s.select} value={type} onChange={(e) => setFilter('type', e.target.value)}>
          <option value="">All types</option>
          {SOURCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <input
          className={s.searchInput}
          type="text"
          placeholder="Search sources..."
          value={search}
          onChange={(e) => setFilter('search', e.target.value)}
        />
      </div>

      {loading ? (
        <div className={s.loading}>Loading sources...</div>
      ) : (
        <div className={s.splitLayout}>
          <div className={s.listPanel}>
            {sources.length === 0 ? (
              <div className={s.empty}>No sources found</div>
            ) : (
              sources.map((src) => {
                const isReady = src.status === 'decomposed';
                return (
                  <div
                    key={src.id}
                    className={
                      !isReady ? s.sourceItemDisabled
                        : String(src.id) === selectedId ? s.sourceItemActive
                        : s.sourceItem
                    }
                    onClick={isReady ? () => setFilter('id', String(src.id)) : undefined}
                  >
                    <div className={s.sourceTitle}>{src.title}</div>
                    <div className={s.sourceMeta}>
                      <SourceTypeBadge type={src.source_type} size={14} />
                      {src.main_contributor && (
                        <>
                          <span>&middot;</span>
                          <span>{src.main_contributor}</span>
                        </>
                      )}
                      {!isReady && (
                        <>
                          <span>&middot;</span>
                          <span className={s.processingBadge}>Processing</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              }))
            }
          </div>

          <div className={s.detailPanel}>
            {!detail ? (
              <div className={s.emptyDetail}>Select a source to view details</div>
            ) : (
              <>
                <div className={s.detailTitle}>{detail.title}</div>
                <div className={s.detailMeta}>
                  <SourceTypeBadge type={detail.source_type} size={16} />
                  {detail.publication && (
                    <> &middot; {detail.publication}</>
                  )}
                  {' '}&middot; {formatDate(detail.publication_date)} &middot;{' '}
                  {detail.word_count?.toLocaleString()} words
                  {detail.contributors.length > 0 && (
                    <> &middot; {detail.contributors[0].name}</>
                  )}
                </div>

                <div className={s.contentTabs}>
                  <button
                    className={contentTab === 'about' ? s.contentTabActive : s.contentTab}
                    onClick={() => setContentTab('about')}
                  >
                    About
                  </button>
                  <button
                    className={contentTab === 'distillation' ? s.contentTabActive : s.contentTab}
                    onClick={() => setContentTab('distillation')}
                  >
                    Distillation
                  </button>
                  <button
                    className={contentTab === 'original' ? s.contentTabActive : s.contentTab}
                    onClick={() => setContentTab('original')}
                  >
                    Original
                  </button>
                  <button
                    className={contentTab === 'claims' ? s.contentTabActive : s.contentTab}
                    onClick={() => setContentTab('claims')}
                  >
                    Claims
                    {detail.claims_count > 0 && (
                      <span className={s.tabBadge}>{detail.claims_count}</span>
                    )}
                  </button>
                </div>

                {contentTab === 'about' ? (
                  <div className={s.tabContent}>
                    <div className={s.fieldGrid}>
                      {detail.contributors.length > 0 && (
                        <div className={s.detailSection}>
                          <div className={s.detailLabel}>Contributors</div>
                          {detail.contributors.map((c) => (
                            <div key={c.id} className={s.contributorRow}>
                              {c.avatar ? (
                                <img src={c.avatar} alt="" className={s.contributorAvatar} />
                              ) : (
                                <span className={s.contributorAvatarPlaceholder}>{c.name.charAt(0)}</span>
                              )}
                              <Link href={`/contributors?id=${c.id}`}>{c.name}</Link>
                              {c.affiliation && <span>({c.affiliation})</span>}
                              <span className={s.contributorRole}>{contributorRoleLabel(c.contributor_role)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className={s.detailSection}>
                        <div className={s.detailLabel}>Publication</div>
                        <InlineEdit
                          value={detail.publication}
                          onSave={(v) => patchSource('publication', v)}
                          placeholder="Add publication..."
                        />
                      </div>
                    </div>

                    {detail.url && (
                      <div className={s.detailSection}>
                        <div className={s.detailLabel}>Source URL</div>
                        <a href={detail.url} target="_blank" rel="noopener noreferrer" className={s.linkedItem}>
                          {detail.url}
                        </a>
                      </div>
                    )}

                    <div className={s.detailSection}>
                      <div className={s.detailLabel}>Notes</div>
                      <InlineEdit
                        value={detail.notes}
                        onSave={(v) => patchSource('notes', v)}
                        multiline
                        placeholder="Add notes..."
                      />
                    </div>

                    {detail.evidence.total > 0 && (
                      <div className={s.detailSection}>
                        <div className={s.detailLabel}>Evidence ({detail.evidence.total})</div>
                        <div className={s.evidenceStats}>
                          {detail.evidence.byStance.supports && (
                            <span className={s.evStatSupporting}>{detail.evidence.byStance.supports} supporting</span>
                          )}
                          {detail.evidence.byStance.contradicts && (
                            <span className={s.evStatContradicting}>{detail.evidence.byStance.contradicts} contradicting</span>
                          )}
                          {detail.evidence.byStance.qualifies && (
                            <span className={s.evStatQualifying}>{detail.evidence.byStance.qualifies} qualifying</span>
                          )}
                        </div>
                      </div>
                    )}

                    {detail.compositions.count > 0 && (
                      <div className={s.detailSection}>
                        <div className={s.detailLabel}>Compositions ({detail.compositions.count})</div>
                        <div className={s.linkedList}>
                          {detail.compositions.items.map((a) => (
                            <Link key={a.id} href={`/compositions?id=${a.id}`} className={s.linkedItem}>
                              {a.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                ) : contentTab === 'distillation' ? (
                  detail.distillation ? (
                    <MarkdownViewer content={detail.distillation} />
                  ) : (
                    <div className={s.emptyContent}>No distillation available</div>
                  )
                ) : contentTab === 'original' ? (
                  <MarkdownViewer content={detail.original} />
                ) : (
                  <ClaimsList sourceId={detail.id} showFilters={false} />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
