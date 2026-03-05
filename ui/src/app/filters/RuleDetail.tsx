'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FilterDetail as FilterDetailType } from '@/lib/types';
import InlineEdit from '@/components/InlineEdit';
import DetailSection from '@/components/DetailSection';
import s from '../shared.module.scss';

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor'), { ssr: false });

export default function RuleDetail({
  detail,
  onPatch,
  onSaveVersion,
}: {
  detail: FilterDetailType;
  onPatch: (field: string, value: unknown) => Promise<void>;
  onSaveVersion: (data: { content_filter: string; preferred_terminology: string }) => Promise<void>;
}) {
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [contentFilterDraft, setContentFilterDraft] = useState('');
  const [preferredTerminologyDraft, setPreferredTerminologyDraft] = useState('');
  const [contentFilterSaving, setContentFilterSaving] = useState(false);

  const currentVersion = detail.versions[0];

  // Reset local state when detail changes
  useEffect(() => {
    setContentFilterDraft(detail.versions?.[0]?.content_filter ?? '');
    setPreferredTerminologyDraft(detail.versions?.[0]?.preferred_terminology ?? '');
    setHistoryExpanded(false);
  }, [detail.id, detail.versions]);

  const hasVersionChanges =
    contentFilterDraft !== (currentVersion?.content_filter ?? '') ||
    preferredTerminologyDraft !== (currentVersion?.preferred_terminology ?? '');

  const handleSave = async () => {
    if (!contentFilterDraft.trim()) return;
    setContentFilterSaving(true);
    await onSaveVersion({ content_filter: contentFilterDraft, preferred_terminology: preferredTerminologyDraft });
    setContentFilterSaving(false);
  };

  const toggleActive = async () => {
    await onPatch('is_active', !detail.is_active);
  };

  return (
    <>
      <div className={s.detailSection}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <div className={s.detailLabel}>Name</div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Version: <strong>{currentVersion?.version ?? '—'}</strong></span>
        </div>
        <InlineEdit
          value={detail.name}
          onSave={(v) => onPatch('name', v)}
          placeholder="Filter name"
        />
      </div>

      <DetailSection label="Description">
        <InlineEdit
          value={detail.description}
          onSave={(v) => onPatch('description', v)}
          multiline
          placeholder="What is this filter for? (optional)"
        />
      </DetailSection>

      <div className={s.divider} />

      <DetailSection label="Content Filter">
        <MarkdownEditor
          value={contentFilterDraft}
          onChange={setContentFilterDraft}
          placeholder="Describe what content to include or exclude from distillation…"
        />
      </DetailSection>

      <DetailSection label="Preferred Terminology">
        <textarea
          style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: '0.25rem', color: 'var(--text-primary)', fontSize: '0.8125rem', resize: 'vertical', boxSizing: 'border-box' }}
          rows={3}
          value={preferredTerminologyDraft}
          onChange={(e) => setPreferredTerminologyDraft(e.target.value)}
          placeholder="Comma-separated vocabulary, e.g. AI agent, prompt engineering, LLM"
        />
      </DetailSection>

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
              <span style={{ marginLeft: '0.375rem' }}>{historyExpanded ? '\u25BE' : '\u25B8'}</span>
            </div>
            {historyExpanded && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {detail.versions.map((v) => (
                  <div key={v.version_id} style={{ borderLeft: '2px solid var(--border-default)', paddingLeft: '0.75rem' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      v{v.version} &mdash; {new Date(v.version_created_at).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
                      {v.content_filter}
                    </div>
                    {v.preferred_terminology && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        <span style={{ fontWeight: 600 }}>Terminology:</span> {v.preferred_terminology}
                      </div>
                    )}
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
          onClick={handleSave}
          disabled={contentFilterSaving || !hasVersionChanges}
        >
          {contentFilterSaving ? 'Saving\u2026' : 'Save'}
        </button>
      </div>
    </>
  );
}
