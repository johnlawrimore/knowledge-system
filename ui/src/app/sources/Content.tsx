'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SourceListItem, SourceDetail } from '@/lib/types';
import { SOURCE_TYPES } from '@/lib/sourceTypes';
import { pageIcon } from '@/lib/pageIcons';
import EmptyState from '@/components/EmptyState';
import FilterBar, { filterStyles } from '@/components/FilterBar';
import SourceList from './SourceList';
import SourceDetailView from './SourceDetail';
import s from './page.module.scss';

const SourcesIcon = pageIcon('sources');

export default function SourcesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sources, setSources] = useState<SourceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SourceDetail | null>(null);

  const [publicationNames, setPublicationNames] = useState<string[]>([]);

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
    fetch('/api/publications')
      .then((r) => r.json())
      .then((d) => setPublicationNames((d.publications || []).map((p: { name: string }) => p.name)))
      .catch(console.error);
  }, []);

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
      .then((d) => { if (!d.error) setDetail(d); })
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

  const discardSource = async () => {
    if (!selectedId) return;
    await fetch(`/api/sources/${selectedId}`, { method: 'DELETE' });
    setDetail(null);
    router.push('/sources');
    // Refresh list
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    if (search) params.set('search', search);
    params.set('limit', '100');
    const r = await fetch(`/api/sources?${params}`);
    const d = await r.json();
    setSources(d.sources || []);
    setTotal(d.total || 0);
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}><SourcesIcon size={32} stroke={2} className={s.pageIcon} />Sources</h1>
      </div>

      <FilterBar>
        <select className={filterStyles.select} value={type} onChange={(e) => setFilter('type', e.target.value)}>
          <option value="">All types</option>
          {SOURCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <input
          className={filterStyles.searchInput}
          type="text"
          placeholder="Search sources..."
          value={search}
          onChange={(e) => setFilter('search', e.target.value)}
        />
      </FilterBar>

      {loading ? (
        <div className={s.loading}>Loading sources...</div>
      ) : (
        <div className={s.splitLayout}>
          <SourceList
            sources={sources}
            total={total}
            selectedId={selectedId}
            status={status}
            type={type}
            search={search}
            onFilter={setFilter}
            onSelect={(id) => setFilter('id', String(id))}
          />

          <div className={s.detailPanel}>
            {!detail ? (
              <EmptyState message="Select a source to view details" variant="detail" />
            ) : (
              <SourceDetailView
                detail={detail}
                publicationNames={publicationNames}
                onPatch={patchSource}
                onDiscard={discardSource}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
