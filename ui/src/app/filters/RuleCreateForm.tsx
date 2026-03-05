'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import s from '../shared.module.scss';

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor'), { ssr: false });

export default function RuleCreateForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { name: string; description: string; content_filter: string; preferred_terminology: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ name: '', description: '', content_filter: '', preferred_terminology: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.content_filter.trim()) { setError('Content filter is required'); return; }
    setCreating(true);
    try {
      await onSubmit(form);
      setForm({ name: '', description: '', content_filter: '', preferred_terminology: '' });
    } catch {
      setError('Failed to create filter');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={s.modalOverlay} onClick={onCancel}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h2 className={s.modalTitle}>New Curation Rule</h2>
          <button className={s.modalClose} onClick={onCancel}>&times;</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className={s.detailLabel}>Name *</label>
            <input
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: '0.25rem', color: 'var(--text-primary)', fontSize: '0.8125rem', boxSizing: 'border-box' }}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. AI as an Engineering Tool"
              autoFocus
            />
          </div>

          <div>
            <label className={s.detailLabel}>Description</label>
            <textarea
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: '0.25rem', color: 'var(--text-primary)', fontSize: '0.8125rem', resize: 'vertical', boxSizing: 'border-box' }}
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What is this filter for? (optional)"
            />
          </div>

          <div>
            <label className={s.detailLabel}>Content Filter *</label>
            <MarkdownEditor
              value={form.content_filter}
              onChange={(v) => setForm({ ...form, content_filter: v })}
              placeholder="Describe what content to include or exclude from distillation…"
            />
          </div>

          <div>
            <label className={s.detailLabel}>Preferred Terminology</label>
            <textarea
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: '0.25rem', color: 'var(--text-primary)', fontSize: '0.8125rem', resize: 'vertical', boxSizing: 'border-box' }}
              rows={3}
              value={form.preferred_terminology}
              onChange={(e) => setForm({ ...form, preferred_terminology: e.target.value })}
              placeholder="Comma-separated vocabulary, e.g. AI agent, prompt engineering, LLM (optional)"
            />
          </div>

          {error && (
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)' }}>{error}</div>
          )}

          <div className={s.actions}>
            <button className={s.createBtn} onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating\u2026' : 'Create Rule'}
            </button>
            <button className={s.actionBtn} onClick={() => { onCancel(); setError(''); }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
