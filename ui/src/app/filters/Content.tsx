'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import InlineEdit from '@/components/InlineEdit';
import { pageIcon } from '@/lib/pageIcons';
import s from '../shared.module.scss';

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor'), { ssr: false });

const FiltersIcon = pageIcon('filters');

interface FilterListItem {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  current_version: number;
  sources_applied: number;
}

interface FilterVersion {
  version_id: number;
  version: number;
  instructions: string;
  version_created_at: string;
}

interface FilterDetail {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  versions: FilterVersion[];
}

export default function FiltersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  const [filters, setFilters] = useState<FilterListItem[]>([]);
  const [detail, setDetail] = useState<FilterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', instructions: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState('');
  const [instructionsSaving, setInstructionsSaving] = useState(false);

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
    setInstructionsDraft(data.versions?.[0]?.instructions ?? '');
    setHistoryExpanded(false);
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

  const handleCreate = async () => {
    setCreateError('');
    if (!createForm.name.trim()) { setCreateError('Name is required'); return; }
    if (!createForm.instructions.trim()) { setCreateError('Instructions are required'); return; }
    setCreating(true);
    const res = await fetch('/api/filters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    });
    setCreating(false);
    if (!res.ok) { setCreateError('Failed to create filter'); return; }
    const data = await res.json();
    setShowCreate(false);
    setCreateForm({ name: '', description: '', instructions: '' });
    await loadFilters();
    router.push(`/filters?id=${data.id}`);
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

  const handleSaveInstructions = async () => {
    if (!detail || !instructionsDraft.trim()) return;
    setInstructionsSaving(true);
    await patch('instructions', instructionsDraft);
    setInstructionsSaving(false);
  };

  const toggleActive = async () => {
    if (!detail) return;
    await patch('is_active', !detail.is_active);
  };

  const currentVersion = detail?.versions[0];
  const nextVersion = detail ? (detail.versions.length + 1) : 1;

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
          {/* List panel */}
          <div className={s.listPanel}>
            {filters.length === 0 && (
              <div className={s.empty}>No content filters yet</div>
            )}
            {filters.map((f) => (
              <div
                key={f.id}
                className={String(f.id) === selectedId ? s.listItemActive : s.listItem}
                onClick={() => selectFilter(f.id)}
              >
                <div className={s.listItemTitle}>
                  {f.name}
                  {!f.is_active && (
                    <span style={{ marginLeft: '0.375rem', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>inactive</span>
                  )}
                </div>
                <div className={s.listItemMeta}>
                  {f.sources_applied > 0 && (
                    <span style={{ color: 'var(--text-muted)' }}>· {f.sources_applied} source{f.sources_applied === 1 ? '' : 's'}</span>
                  )}
                  {f.description && (
                    <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {f.description}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div className={s.detailPanel}>
            {!detail ? (
              <div className={s.emptyDetail}>Select a filter to view details</div>
            ) : (
              <>
                <div className={s.detailSection}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <div className={s.detailLabel}>Name</div>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Version: <strong>{currentVersion?.version ?? '—'}</strong></span>
                  </div>
                  <InlineEdit
                    value={detail.name}
                    onSave={(v) => patch('name', v)}
                    placeholder="Filter name"
                  />
                </div>

                <div className={s.detailSection}>
                  <div className={s.detailLabel}>Description</div>
                  <InlineEdit
                    value={detail.description}
                    onSave={(v) => patch('description', v)}
                    multiline
                    placeholder="What is this filter for? (optional)"
                  />
                </div>

                <div className={s.divider} />

                <div className={s.detailSection}>
                  <div className={s.detailLabel} style={{ marginBottom: '0.375rem' }}>Instructions</div>
                  <MarkdownEditor
                    value={instructionsDraft}
                    onChange={setInstructionsDraft}
                    placeholder="Describe what content to include or exclude from distillation…"
                  />
                </div>

                <div className={s.divider} />

                <div className={s.detailSection}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <button
                      role="switch"
                      aria-checked={detail.is_active}
                      onClick={toggleActive}
                      style={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        width: '2.25rem',
                        height: '1.25rem',
                        borderRadius: '9999px',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0,
                        background: detail.is_active ? 'var(--accent-green)' : 'var(--border-default)',
                        transition: 'background 0.15s',
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        left: detail.is_active ? 'calc(100% - 1rem - 2px)' : '2px',
                        width: '1rem',
                        height: '1rem',
                        borderRadius: '50%',
                        background: 'white',
                        transition: 'left 0.15s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }} />
                    </button>
                    <span style={{ fontSize: '0.8125rem', color: detail.is_active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {detail.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {detail.versions.length > 1 && (
                  <>
                    <div className={s.divider} />
                    <div className={s.detailSection}>
                      <div
                        className={s.detailLabel}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => setHistoryExpanded(!historyExpanded)}
                      >
                        Version History ({detail.versions.length})
                        <span style={{ marginLeft: '0.375rem' }}>{historyExpanded ? '▾' : '▸'}</span>
                      </div>
                      {historyExpanded && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {detail.versions.map((v) => (
                            <div key={v.version_id} style={{ borderLeft: '2px solid var(--border-default)', paddingLeft: '0.75rem' }}>
                              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                v{v.version} &mdash; {new Date(v.version_created_at).toLocaleDateString()}
                              </div>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
                                {v.instructions}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className={s.divider} />

                <div className={s.detailSection}>
                  <button
                    className={s.createBtn}
                    onClick={handleSaveInstructions}
                    disabled={instructionsSaving || instructionsDraft === (currentVersion?.instructions ?? '')}
                  >
                    {instructionsSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className={s.modalOverlay} onClick={() => setShowCreate(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>New Content Filter</h2>
              <button className={s.modalClose} onClick={() => setShowCreate(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className={s.detailLabel}>Name *</label>
                <input
                  style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: '0.25rem', color: 'var(--text-primary)', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. AI as an Engineering Tool"
                  autoFocus
                />
              </div>

              <div>
                <label className={s.detailLabel}>Description</label>
                <textarea
                  style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: '0.25rem', color: 'var(--text-primary)', fontSize: '0.8125rem', resize: 'vertical', boxSizing: 'border-box' }}
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="What is this filter for? (optional)"
                />
              </div>

              <div>
                <label className={s.detailLabel}>Instructions *</label>
                <MarkdownEditor
                  value={createForm.instructions}
                  onChange={(v) => setCreateForm({ ...createForm, instructions: v })}
                  placeholder="Describe what content to include or exclude from distillation…"
                />
              </div>

              {createError && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)' }}>{createError}</div>
              )}

              <div className={s.actions}>
                <button className={s.createBtn} onClick={handleCreate} disabled={creating}>
                  {creating ? 'Creating…' : 'Create Filter'}
                </button>
                <button className={s.actionBtn} onClick={() => { setShowCreate(false); setCreateError(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
