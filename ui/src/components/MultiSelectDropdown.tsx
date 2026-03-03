'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import s from './MultiSelectDropdown.module.scss';

export interface FlatOption {
  id: number;
  name: string;
  depth: number;
  childIds: number[];
  parentId: number | null;
}

interface Props {
  label: string;
  options: FlatOption[];
  selected: Set<number>;
  onChange: (selected: Set<number>) => void;
}

export default function MultiSelectDropdown({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Build lookup for ancestors
  const ancestorsOf = (id: number): number[] => {
    const result: number[] = [];
    const opt = options.find((o) => o.id === id);
    if (opt?.parentId != null) {
      result.push(opt.parentId, ...ancestorsOf(opt.parentId));
    }
    return result;
  };

  // Get all descendant IDs of a node (recursive via childIds)
  const descendantsOf = (id: number): number[] => {
    const opt = options.find((o) => o.id === id);
    if (!opt || opt.childIds.length === 0) return [];
    const result: number[] = [];
    for (const cid of opt.childIds) {
      result.push(cid, ...descendantsOf(cid));
    }
    return result;
  };

  // Check if all children of a parent are selected
  const allChildrenSelected = (parentId: number, next: Set<number>): boolean => {
    const parent = options.find((o) => o.id === parentId);
    if (!parent || parent.childIds.length === 0) return false;
    return parent.childIds.every((cid) => next.has(cid));
  };

  // Check if a node has some (but not all) descendants selected
  const isIndeterminate = useCallback((id: number): boolean => {
    const descs = descendantsOf(id);
    if (descs.length === 0) return false;
    const someSelected = descs.some((d) => selected.has(d));
    const allSelected = descs.every((d) => selected.has(d));
    return someSelected && !allSelected;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, selected]);

  const handleToggle = (id: number) => {
    const next = new Set(selected);
    const wasSelected = next.has(id);

    if (wasSelected) {
      // Uncheck: remove this node + all descendants
      next.delete(id);
      for (const did of descendantsOf(id)) next.delete(did);
      // Remove any ancestor that was fully selected
      for (const aid of ancestorsOf(id)) next.delete(aid);
    } else {
      // Check: add this node + all descendants
      next.add(id);
      for (const did of descendantsOf(id)) next.add(did);
      // Bubble up: if all siblings now selected, select parent
      for (const aid of ancestorsOf(id)) {
        if (allChildrenSelected(aid, next)) next.add(aid);
      }
    }

    onChange(next);
  };

  return (
    <div className={s.wrapper} ref={wrapperRef}>
      <button
        className={open ? s.triggerActive : s.trigger}
        onClick={() => setOpen(!open)}
        type="button"
      >
        {label}
        {selected.size > 0 && <span className={s.count}>{selected.size}</span>}
        <span className={s.arrow}>&#9662;</span>
      </button>

      {open && (
        <div className={s.dropdown}>
          {options.map((opt) => (
            <label
              key={opt.id}
              className={s.option}
              style={{ paddingLeft: `${0.75 + opt.depth * 1.25}rem` }}
            >
              <input
                type="checkbox"
                checked={selected.has(opt.id)}
                ref={(el) => { if (el) el.indeterminate = isIndeterminate(opt.id); }}
                onChange={() => handleToggle(opt.id)}
              />
              {opt.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
