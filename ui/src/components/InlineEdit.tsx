'use client';

import { useState, useRef, useEffect } from 'react';
import s from './InlineEdit.module.scss';

export default function InlineEdit({
  value,
  onSave,
  multiline = false,
  placeholder = 'Click to edit...',
  className = '',
}: {
  value: string | null;
  onSave: (val: string) => Promise<void>;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [editing]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  if (!editing) {
    return (
      <div
        onClick={() => {
          setDraft(value || '');
          setEditing(true);
        }}
        className={`${s.display} ${!value ? s.placeholder : ''} ${className}`}
      >
        {value || placeholder}
      </div>
    );
  }

  return (
    <div className={className}>
      {multiline ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && cancel()}
          rows={4}
          className={s.input}
        />
      ) : (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel();
            if (e.key === 'Enter') save();
          }}
          className={s.input}
        />
      )}
      <div className={s.actions}>
        <button onClick={save} disabled={saving} className={s.saveBtn}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={cancel} className={s.cancelBtn}>
          Cancel
        </button>
      </div>
    </div>
  );
}
