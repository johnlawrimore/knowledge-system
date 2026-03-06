'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContributorListItem, ContributorDetail } from '@/lib/types';
import { pageIcon } from '@/lib/pageIcons';
import EmptyState from '@/components/EmptyState';
import FilterBar, { filterStyles } from '@/components/FilterBar';
import ContributorList from './ContributorList';
import ContributorDetailView from './ContributorDetail';
import s from '../shared.module.scss';

const ContributorsIcon = pageIcon('contributors');

export default function ContributorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contributors, setContributors] = useState<ContributorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ContributorDetail | null>(null);

  const selectedId = searchParams.get('id');
  const search = searchParams.get('search') || '';

  const setFilter = useCallback(
    (key: string, val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) params.set(key, val);
      else params.delete(key);
      router.push(`/contributors?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    setLoading(true);
    fetch('/api/contributors')
      .then((r) => r.json())
      .then((d) => {
        const list = d.contributors || [];
        setContributors(list);
        if (!selectedId && list.length > 0) {
          router.replace(`/contributors?id=${list[0].id}`);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    fetch(`/api/contributors/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(console.error);
  }, [selectedId]);

  const patchContributor = async (field: string, value: string) => {
    if (!selectedId) return;
    await fetch(`/api/contributors/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    const r = await fetch(`/api/contributors/${selectedId}`);
    setDetail(await r.json());
  };

  const filtered = search
    ? contributors.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.affiliation || '').toLowerCase().includes(search.toLowerCase())
    )
    : contributors;

  useEffect(() => {
    if (!selectedId || filtered.length === 0) return;
    const stillInList = filtered.some((c) => String(c.id) === selectedId);
    if (!stillInList) {
      router.replace(`/contributors?id=${filtered[0].id}${search ? `&search=${search}` : ''}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}><ContributorsIcon size={32} stroke={2} className={s.pageIcon} />Contributors</h1>
      </div>

      <FilterBar>
        <input
          className={filterStyles.searchInput}
          type="text"
          placeholder="Search contributors..."
          value={search}
          onChange={(e) => setFilter('search', e.target.value)}
        />
      </FilterBar>

      {loading ? (
        <div className={s.loading}>Loading contributors...</div>
      ) : (
        <div className={s.splitLayout}>
          <ContributorList
            contributors={filtered}
            selectedId={selectedId}
            search={search}
            tierFilter=""
            onFilter={setFilter}
            onSelect={(id) => setFilter('id', String(id))}
          />

          <div className={s.detailPanel}>
            {!detail ? (
              <EmptyState message="Select a contributor to view details" variant="detail" />
            ) : (
              <ContributorDetailView
                detail={detail}
                onPatch={patchContributor}
                onAvatarClick={() => {}}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
