'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterListItem, FilterDetail as FilterDetailType } from '@/lib/types';
import { pageIcon } from '@/lib/pageIcons';
import EmptyState from '@/components/EmptyState';
import RuleList from './RuleList';
import RuleDetailComponent from './RuleDetail';
import RuleCreateForm from './RuleCreateForm';
import s from '../shared.module.scss';

const FiltersIcon = pageIcon('filters');

export default function FiltersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  const [filters, setFilters] = useState<FilterListItem[]>([]);
  const [detail, setDetail] = useState<FilterDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadFilters = useCallback(async (autoSelect = false) => {
    const res = await fetch('/api/filters');
    const data = await res.json();
    const list = data.filters || [];
    setFilters(list);
    setLoading(false);
    if (autoSelect && !selectedId && list.length > 0) {
      router.replace(`/filters?id=${list[0].id}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/filters/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setDetail(data);
  }, []);

  useEffect(() => { loadFilters(true); }, [loadFilters]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  const selectFilter = (id: number) => {
    router.push(`/filters?id=${id}`);
  };

  const handleCreate = async (data: { name: string; description: string; content_filter: string }) => {
    const res = await fetch('/api/filters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create filter');
    const result = await res.json();
    setShowCreate(false);
    await loadFilters();
    router.push(`/filters?id=${result.id}`);
  };

  const patch = async (field: string, value: unknown) => {
    if (!detail) return;
    await fetch(`/api/filters/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    await loadFilters();
    await loadDetail(String(detail.id));
  };

  const handleSaveVersion = async (data: { content_filter: string; preferred_terminology: string }) => {
    await fetch(`/api/filters/${detail!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await loadFilters();
    await loadDetail(String(detail!.id));
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.title}>
          <FiltersIcon size={20} className={s.pageIcon} />
          <h1>Curation Rules</h1>
        </div>
        <button className={s.createBtn} onClick={() => setShowCreate(true)}>
          + New Rule
        </button>
      </div>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 1.25rem', maxWidth: '65rem' }}>
        Curation rules shape how sources are distilled. Rules allows a <strong>content filter</strong> that controls what material survives distillation and a a comma-separated list of <strong>preferred terminology</strong> that guides use of vocabulary..
      </p>

      {loading ? (
        <div className={s.loading}>Loading…</div>
      ) : (
        <div className={s.splitLayout}>
          <RuleList
            filters={filters}
            selectedId={selectedId}
            onSelect={selectFilter}
            onCreate={() => setShowCreate(true)}
          />

          <div className={s.detailPanel}>
            {!detail ? (
              <EmptyState message="Select a filter to view details" variant="detail" />
            ) : (
              <RuleDetailComponent
                detail={detail}
                onPatch={patch}
                onSaveVersion={handleSaveVersion}
              />
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <RuleCreateForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
