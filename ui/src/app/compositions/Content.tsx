'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CompositionListItem, CompositionDetail } from '@/lib/types';
import { pageIcon } from '@/lib/pageIcons';
import CompositionList from './CompositionList';
import CompositionDetailView from './CompositionDetail';
import s from '../shared.module.scss';

const CompositionsIcon = pageIcon('compositions');

export default function CompositionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [compositions, setCompositions] = useState<CompositionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CompositionDetail | null>(null);

  const selectedId = searchParams.get('id');
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const setFilter = useCallback(
    (key: string, val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) params.set(key, val);
      else params.delete(key);
      router.push(`/compositions?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    params.set('limit', '100');

    fetch(`/api/compositions?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setCompositions(d.compositions || []);
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
    fetch(`/api/compositions/${selectedId}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch(console.error);
  }, [selectedId]);

  const patchComposition = async (field: string, value: string) => {
    if (!selectedId) return;
    await fetch(`/api/compositions/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    const r = await fetch(`/api/compositions/${selectedId}`);
    setDetail(await r.json());
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}><CompositionsIcon size={32} stroke={2} className={s.pageIcon} />Compositions</h1>
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
          placeholder="Search compositions..."
          value={search}
          onChange={(e) => setFilter('search', e.target.value)}
        />
      </div>

      {loading ? (
        <div className={s.loading}>Loading compositions...</div>
      ) : (
        <div className={s.splitLayout}>
          <CompositionList
            compositions={compositions}
            selectedId={selectedId}
            onSelect={(id) => setFilter('id', String(id))}
          />

          <div className={s.detailPanel}>
            {!detail ? (
              <div className={s.emptyDetail}>
                Select a composition to view details
              </div>
            ) : (
              <CompositionDetailView
                detail={detail}
                onPatch={patchComposition}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
