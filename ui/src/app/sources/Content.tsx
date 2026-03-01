'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import InlineEdit from '@/components/InlineEdit';
import MarkdownViewer from '@/components/MarkdownViewer';
import s from './page.module.scss';

interface SourceListItem {
  id: number;
  title: string;
  source_type: string;
  word_count: number;
  status: string;
  date_collected: string;
}

interface SourceDetail {
  id: number;
  title: string;
  source_type: string;
  url: string | null;
  publication_date: string | null;
  word_count: number;
  status: string;
  notes: string | null;
  evaluation_results: Record<string, unknown> | null;
  content_preview: string;
  content_md: string;
  content_has_more: boolean;
  contributors: { id: number; name: string; affiliation: string; contributor_role: string }[];
  artifacts: { count: number; items: { id: number; title: string; status: string }[] };
  evidence: { total: number; byStance: Record<string, number> };
}

export default function SourcesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sources, setSources] = useState<SourceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SourceDetail | null>(null);

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
        <h1 className={s.title}>Sources</h1>
      </div>

      <div className={s.filters}>
        <select className={s.select} value={status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          <option value="collected">Collected</option>
          <option value="distilling">Distilling</option>
          <option value="distilled">Distilled</option>
          <option value="decomposing">Decomposing</option>
          <option value="decomposed">Decomposed</option>
        </select>

        <select className={s.select} value={type} onChange={(e) => setFilter('type', e.target.value)}>
          <option value="">All types</option>
          <option value="youtube_video">YouTube Video</option>
          <option value="blog_post">Blog Post</option>
          <option value="academic_paper">Academic Paper</option>
          <option value="book">Book</option>
          <option value="book_chapter">Book Chapter</option>
          <option value="conference_talk">Conference Talk</option>
          <option value="podcast">Podcast</option>
          <option value="report">Report</option>
          <option value="documentation">Documentation</option>
          <option value="newsletter">Newsletter</option>
          <option value="website">Website</option>
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
              sources.map((src) => (
                <div
                  key={src.id}
                  className={String(src.id) === selectedId ? s.sourceItemActive : s.sourceItem}
                  onClick={() => setFilter('id', String(src.id))}
                >
                  <div className={s.sourceTitle}>{src.title}</div>
                  <div className={s.sourceMeta}>
                    <span>{src.source_type}</span>
                    <span>&middot;</span>
                    <span className={`${s.statusBadge} status-${src.status}`}>{src.status}</span>
                    <span>&middot;</span>
                    <span>{src.word_count?.toLocaleString()}w</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={s.detailPanel}>
            {!detail ? (
              <div className={s.emptyDetail}>Select a source to view details</div>
            ) : (
              <>
                <div className={s.detailTitle}>{detail.title}</div>
                <div className={s.detailMeta}>
                  {detail.source_type} &middot;{' '}
                  {detail.publication_date || 'no date'} &middot;{' '}
                  {detail.word_count?.toLocaleString()} words &middot;{' '}
                  <span className={`${s.statusBadge} status-${detail.status}`}>{detail.status}</span>
                </div>

                {detail.url && (
                  <div className={s.detailSection}>
                    <div className={s.detailLabel}>URL</div>
                    <a href={detail.url} target="_blank" rel="noopener noreferrer" className={s.linkedItem}>
                      {detail.url}
                    </a>
                  </div>
                )}

                {detail.contributors.length > 0 && (
                  <div className={s.detailSection}>
                    <div className={s.detailLabel}>Contributors</div>
                    {detail.contributors.map((c) => (
                      <div key={c.id} className={s.contributorRow}>
                        <Link href={`/contributors?id=${c.id}`}>{c.name}</Link>
                        {c.affiliation && <span>({c.affiliation})</span>}
                        <span className={s.contributorRole}>{c.contributor_role}</span>
                      </div>
                    ))}
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

                {detail.artifacts.count > 0 && (
                  <div className={s.detailSection}>
                    <div className={s.detailLabel}>Artifacts ({detail.artifacts.count})</div>
                    <div className={s.linkedList}>
                      {detail.artifacts.items.map((a) => (
                        <Link key={a.id} href={`/artifacts?id=${a.id}`} className={s.linkedItem}>
                          {a.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

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

                <div className={s.detailSection}>
                  <div className={s.detailLabel}>Content</div>
                  <MarkdownViewer content={detail.content_md} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
