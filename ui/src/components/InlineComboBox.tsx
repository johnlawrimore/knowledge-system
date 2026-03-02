'use client';

import { useState, useRef, useEffect } from 'react';
import s from './InlineComboBox.module.scss';

export default function InlineComboBox({
  value,
  onSave,
  suggestions,
  placeholder = 'Click to edit...',
  className = '',
}: {
  value: string | null;
  onSave: (val: string) => Promise<void>;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = draft.trim()
    ? suggestions.filter((item) =>
        item.toLowerCase().includes(draft.toLowerCase()) &&
        item.toLowerCase() !== draft.toLowerCase()
      )
    : [];

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [draft]);

  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

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
    setShowDropdown(false);
  };

  const selectItem = (item: string) => {
    setDraft(item);
    setShowDropdown(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showDropdown) {
        setShowDropdown(false);
        setActiveIndex(-1);
      } else {
        cancel();
      }
      return;
    }

    if (showDropdown && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
        return;
      }
      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        selectItem(filtered[activeIndex]);
        return;
      }
    }

    if (e.key === 'Enter') {
      save();
    }
  };

  if (!editing) {
    return (
      <div
        onClick={() => {
          setDraft(value || '');
          setEditing(true);
          setShowDropdown(true);
        }}
        className={`${s.display} ${!value ? s.placeholder : ''} ${className}`}
      >
        {value || placeholder}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={s.wrapper}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay to allow click on dropdown item
            setTimeout(() => setShowDropdown(false), 150);
          }}
          onFocus={() => setShowDropdown(true)}
          className={s.input}
        />
        {showDropdown && filtered.length > 0 && (
          <div className={s.dropdown} ref={dropdownRef}>
            {filtered.map((item, i) => (
              <div
                key={item}
                className={i === activeIndex ? s.dropdownItemActive : s.dropdownItem}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectItem(item);
                }}
              >
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
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
