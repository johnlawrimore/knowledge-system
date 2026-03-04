'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContributorListItem, ContributorDetail } from '@/lib/types';
import { pageIcon } from '@/lib/pageIcons';
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
      .then((d) => setContributors(d.contributors || []))
      .catch(console.error)
      .finally(() => setLoading(false));
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

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}><ContributorsIcon size={32} stroke={2} className={s.pageIcon} />Contributors</h1>
      </div>

      <div className={s.filters}>
        <input
          className={s.searchInput}
          type="text"
          placeholder="Search contributors..."
          value={search}
          onChange={(e) => setFilter('search', e.target.value)}
        />
      </div>

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
              <div className={s.emptyDetail}>Select a contributor to view details</div>
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
