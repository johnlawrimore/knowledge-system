'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FilterDetail as FilterDetailType } from '@/lib/types';
import InlineEdit from '@/components/InlineEdit';
import DetailSection from '@/components/DetailSection';
import s from '../shared.module.scss';

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor'), { ssr: false });

export default function FilterDetail({
  detail,
  onPatch,
  onSaveInstructions,
}: {
  detail: FilterDetailType;
  onPatch: (field: string, value: unknown) => Promise<void>;
  onSaveInstructions: (instructions: string) => Promise<void>;
}) {
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState('');
  const [instructionsSaving, setInstructionsSaving] = useState(false);

  const currentVersion = detail.versions[0];

  // Reset local state when detail changes
  useEffect(() => {
    setInstructionsDraft(detail.versions?.[0]?.instructions ?? '');
    setHistoryExpanded(false);
  }, [detail.id, detail.versions]);

  const handleSave = async () => {
    if (!instructionsDraft.trim()) return;
    setInstructionsSaving(true);
    await onSaveInstructions(instructionsDraft);
    setInstructionsSaving(false);
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

      <DetailSection label="Instructions">
        <MarkdownEditor
          value={instructionsDraft}
          onChange={setInstructionsDraft}
          placeholder="Describe what content to include or exclude from distillation…"
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
          onClick={handleSave}
          disabled={instructionsSaving || instructionsDraft === (currentVersion?.instructions ?? '')}
        >
          {instructionsSaving ? 'Saving\u2026' : 'Save'}
        </button>
      </div>
    </>
  );
}
