'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import InlineEdit from '@/components/InlineEdit';
import LinkChip from '@/components/LinkChip';
import s from '../shared.module.scss';
import ps from './page.module.scss';

interface ArtifactListItem {
  id: number;
  title: string;
  word_count: number;
  source_strategy: string;
  status: string;
  created_at: string;
}

interface ArtifactSource {
  id: number;
  title: string;
  source_type: string;
  url: string | null;
  publication_date: string | null;
  word_count: number;
  status: string;
  contribution_note: string | null;
}

interface ArtifactDetail {
  id: number;
  title: string;
  content_md: string;
  word_count: number;
  source_strategy: string;
  evaluation_results: Record<string, unknown> | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sources: ArtifactSource[];
  claim_count: number;
}

export default function ArtifactsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [artifacts, setArtifacts] = useState<ArtifactListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ArtifactDetail | null>(null);
  const [showContent, setShowContent] = useState(false);

  const selectedId = searchParams.get('id');
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const setFilter = useCallback(
    (key: string, val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) params.set(key, val);
      else params.delete(key);
      router.push(`/artifacts?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    params.set('limit', '100');

    fetch(`/api/artifacts?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setArtifacts(d.artifacts || []);
        setTotal(d.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status, search]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    fetch(`/api/artifacts/${selectedId}`)
      .then((r) => r.json())
      .then((d) => {
        setDetail(d);
        setShowContent(false);
      })
      .catch(console.error);
  }, [selectedId]);

  const patchArtifact = async (field: string, value: string) => {
    if (!selectedId) return;
    await fetch(`/api/artifacts/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    const r = await fetch(`/api/artifacts/${selectedId}`);
    setDetail(await r.json());
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Artifacts</h1>
      </div>

      <div className={s.filters}>
        <select
          className={s.select}
          value={status}
          onChange={(e) => setFilter('status', e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        <input
          className={s.searchInput}
          type="text"
          placeholder="Search artifacts..."
          value={search}
          onChange={(e) => setFilter('search', e.target.value)}
        />
      </div>

      {loading ? (
        <div className={s.loading}>Loading artifacts...</div>
      ) : (
        <div className={s.splitLayout}>
          <div className={s.listPanel}>
            {artifacts.length === 0 ? (
              <div className={s.empty}>No artifacts found</div>
            ) : (
              artifacts.map((a) => (
                <div
                  key={a.id}
                  className={
                    String(a.id) === selectedId
                      ? s.listItemActive
                      : s.listItem
                  }
                  onClick={() => setFilter('id', String(a.id))}
                >
                  <div className={s.listItemTitle}>{a.title}</div>
                  <div className={s.listItemMeta}>
                    <span>{a.source_strategy}</span>
                    {' \u00B7 '}
                    <span className={ps.statusBadge}>{a.status}</span>
                    {' \u00B7 '}
                    <span>{a.word_count?.toLocaleString()}w</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={s.detailPanel}>
            {!detail ? (
              <div className={s.emptyDetail}>
                Select an artifact to view details
              </div>
            ) : (
              <>
                <div className={s.detailTitle}>{detail.title}</div>
                <div className={ps.detailMeta}>
                  {detail.source_strategy}
                  {' \u00B7 '}
                  {detail.word_count?.toLocaleString()} words
                  {' \u00B7 '}
                  <span className={ps.statusBadge}>{detail.status}</span>
                  {' \u00B7 '}
                  {detail.claim_count} claims
                </div>

                {detail.sources.length > 0 && (
                  <div className={s.detailSection}>
                    <div className={s.detailLabel}>
                      Sources ({detail.sources.length})
                    </div>
                    <div className={ps.linkedList}>
                      {detail.sources.map((src) => (
                        <div key={src.id} className={ps.sourceRow}>
                          <Link
                            href={`/sources?id=${src.id}`}
                            className={ps.linkedItem}
                          >
                            {src.title}
                          </Link>
                          <span className={ps.sourceType}>
                            {src.source_type}
                          </span>
                          {src.contribution_note && (
                            <span className={ps.contributionNote}>
                              {src.contribution_note}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={s.detailSection}>
                  <div className={s.detailLabel}>Notes</div>
                  <InlineEdit
                    value={detail.notes}
                    onSave={(v) => patchArtifact('notes', v)}
                    multiline
                    placeholder="Add notes..."
                  />
                </div>

                {detail.evaluation_results && (
                  <div className={s.detailSection}>
                    <div className={s.detailLabel}>Evaluation Results</div>
                    <div className={ps.evalBlock}>
                      {JSON.stringify(detail.evaluation_results, null, 2)}
                    </div>
                  </div>
                )}

                <div className={s.detailSection}>
                  <div className={s.detailLabel}>Content</div>
                  {!showContent ? (
                    <button
                      className={ps.contentToggle}
                      onClick={() => setShowContent(true)}
                    >
                      Show full content
                    </button>
                  ) : (
                    <>
                      <button
                        className={ps.contentToggle}
                        onClick={() => setShowContent(false)}
                      >
                        Hide content
                      </button>
                      <div className={ps.contentBlock}>
                        {detail.content_md}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
