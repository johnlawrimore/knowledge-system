'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterListItem, FilterDetail as FilterDetailType } from '@/lib/types';
import { pageIcon } from '@/lib/pageIcons';
import FilterList from './FilterList';
import FilterDetailComponent from './FilterDetail';
import FilterCreateForm from './FilterCreateForm';
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

  const loadFilters = useCallback(async () => {
    const res = await fetch('/api/filters');
    const data = await res.json();
    setFilters(data.filters || []);
    setLoading(false);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/filters/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setDetail(data);
  }, []);

  useEffect(() => { loadFilters(); }, [loadFilters]);

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

  const handleCreate = async (data: { name: string; description: string; instructions: string }) => {
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

  const handleSaveInstructions = async (instructions: string) => {
    await patch('instructions', instructions);
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.title}>
          <FiltersIcon size={20} className={s.pageIcon} />
          <h1>Content Filters</h1>
        </div>
        <button className={s.createBtn} onClick={() => setShowCreate(true)}>
          + New Filter
        </button>
      </div>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 1.25rem', maxWidth: '65rem' }}>
        Content filters shape what material survives source distillation. Content filters can be applied to the distillation process in addition to standard filtering, thereby limiting what content reaches claims, evidence, etc.
      </p>

      {loading ? (
        <div className={s.loading}>Loading…</div>
      ) : (
        <div className={s.splitLayout}>
          <FilterList
            filters={filters}
            selectedId={selectedId}
            onSelect={selectFilter}
            onCreate={() => setShowCreate(true)}
          />

          <div className={s.detailPanel}>
            {!detail ? (
              <div className={s.emptyDetail}>Select a filter to view details</div>
            ) : (
              <FilterDetailComponent
                detail={detail}
                onPatch={patch}
                onSaveInstructions={handleSaveInstructions}
              />
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <FilterCreateForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
