'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FilterDetail as FilterDetailType } from '@/lib/types';
import InlineEdit from '@/components/InlineEdit';
import MarkdownViewer from '@/components/MarkdownViewer';
import DetailSection from '@/components/DetailSection';
import s from '../shared.module.scss';
import rs from './rules.module.scss';

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor'), { ssr: false });

export default function RuleDetail({
  detail,
  onPatch,
  onSaveVersion,
}: {
  detail: FilterDetailType;
  onPatch: (field: string, value: unknown) => Promise<void>;
  onSaveVersion: (data: { content_filter?: string; preferred_terminology?: string }) => Promise<void>;
}) {
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const currentVersion = detail.versions[0];

  useEffect(() => {
    setHistoryExpanded(false);
  }, [detail.id]);

  const toggleActive = async () => {
    await onPatch('is_active', !detail.is_active);
  };

  return (
    <>
      <div className={s.box}>
        <div className={rs.nameRow}>
          <DetailSection label="Name">
            <InlineEdit
              value={detail.name}
              onSave={(v) => onPatch('name', v)}
              placeholder="Rule name"
            />
          </DetailSection>
          <span className={rs.versionTag}>v{currentVersion?.version ?? '—'}</span>
        </div>

        <DetailSection label="Description">
          <InlineEdit
            value={detail.description}
            onSave={(v) => onPatch('description', v)}
            multiline
            placeholder="What is this rule for? (optional)"
          />
        </DetailSection>

        <DetailSection label="Status">
          <div className={rs.toggleRow}>
            <button
              role="switch"
              aria-checked={detail.is_active}
              onClick={toggleActive}
              className={`${rs.toggle} ${detail.is_active ? rs.toggleOn : ''}`}
            >
              <span className={rs.toggleThumb} />
            </button>
            <span className={detail.is_active ? rs.statusActive : rs.statusInactive}>
              {detail.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </DetailSection>
      </div>

      <div className={s.box}>
        <ContentFilterEditor
          value={currentVersion?.content_filter ?? ''}
          onSave={(v) => onSaveVersion({ content_filter: v })}
        />

        <DetailSection label="Preferred Terminology">
          <InlineEdit
            value={currentVersion?.preferred_terminology ?? null}
            onSave={(v) => onSaveVersion({ preferred_terminology: v })}
            multiline
            placeholder="Comma-separated vocabulary, e.g. AI agent, prompt engineering, LLM"
          />
        </DetailSection>
      </div>

      {detail.versions.length > 1 && (
        <div className={s.box}>
          <div
            className={s.detailLabel}
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setHistoryExpanded(!historyExpanded)}
          >
            Version History ({detail.versions.length})
            <span className={rs.expandIcon}>{historyExpanded ? '\u25BE' : '\u25B8'}</span>
          </div>
          {historyExpanded && (
            <div className={rs.historyList}>
              {detail.versions.map((v) => (
                <div key={v.version_id} className={rs.historyItem}>
                  <div className={rs.historyMeta}>
                    v{v.version} &mdash; {new Date(v.version_created_at).toLocaleDateString()}
                  </div>
                  <div className={rs.historyFieldLabel}>Content Filter</div>
                  <div className={rs.historyContent}>{v.content_filter}</div>
                  {v.preferred_terminology && (
                    <>
                      <div className={rs.historyFieldLabel}>Preferred Terminology</div>
                      <div className={rs.historyContent}>{v.preferred_terminology}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ContentFilterEditor({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <DetailSection label="Content Filter">
        <div onClick={() => { setDraft(value); setEditing(true); }} className={rs.clickable}>
          {value ? <MarkdownViewer content={value} /> : <span className={rs.placeholder}>Describe what content to include or exclude…</span>}
        </div>
      </DetailSection>
    );
  }

  return (
    <DetailSection label="Content Filter">
      <MarkdownEditor value={draft} onChange={setDraft} placeholder="Describe what content to include or exclude from distillation…" />
      <div className={rs.editActions}>
        <button onClick={handleSave} disabled={saving} className={rs.saveBtn}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={handleCancel} className={rs.cancelBtn}>Cancel</button>
      </div>
    </DetailSection>
  );
}
