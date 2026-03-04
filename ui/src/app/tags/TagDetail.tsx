'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClaimRow } from '@/lib/types';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import s from '../shared.module.scss';

export default function TagDetail({
  tag,
  claims,
  claimsLoading,
  onRename,
  onDelete,
  onClose,
}: {
  tag: string;
  claims: ClaimRow[];
  claimsLoading: boolean;
  onRename: (oldTag: string, newTag: string) => Promise<void>;
  onDelete: (tag: string) => Promise<void>;
  onClose: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleRename = async () => {
    if (!renameValue.trim()) return;
    await onRename(tag, renameValue.trim());
    setRenaming(false);
  };

  const handleDelete = async () => {
    await onDelete(tag);
    setConfirmingDelete(false);
  };

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>{tag}</span>
          <button className={s.modalClose} onClick={onClose}>&times;</button>
        </div>

        <div className={s.actions}>
          {renaming ? (
            <>
              <input
                className={s.searchInput}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setRenaming(false);
                }}
                placeholder="New tag name..."
              />
              <button className={s.actionBtn} onClick={handleRename}>
                Save
              </button>
              <button className={s.actionBtn} onClick={() => setRenaming(false)}>
                Cancel
              </button>
            </>
          ) : confirmingDelete ? (
            <ConfirmDialog
              message={`Delete tag "${tag}" from all claims?`}
              confirmLabel="Delete"
              onConfirm={handleDelete}
              onCancel={() => setConfirmingDelete(false)}
              variant="danger"
            />
          ) : (
            <>
              <button
                className={s.actionBtn}
                onClick={() => {
                  setRenameValue(tag);
                  setRenaming(true);
                }}
              >
                Rename
              </button>
              <button className={s.dangerBtn} onClick={() => setConfirmingDelete(true)}>
                Delete
              </button>
            </>
          )}
        </div>

        <hr className={s.divider} />

        <div className={s.detailSection}>
          <div className={s.detailLabel}>
            Claims ({claims.length})
          </div>
          {claimsLoading ? (
            <div className={s.loading}>Loading claims...</div>
          ) : claims.length === 0 ? (
            <div className={s.empty}>No claims with this tag</div>
          ) : (
            <div className={s.claimList}>
              {claims.map((c) => (
                <Link key={c.id} href={`/claims/${c.id}`} className={s.claimRow}>
                  <span className={s.claimScore}>
                    <ConfidenceBadge confidence={c.computed_confidence} score={c.score} />
                  </span>{' '}
                  <span className={s.claimStatement}>{c.statement}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
