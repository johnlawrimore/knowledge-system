'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClaimRow } from '@/lib/types';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import DetailSection from '@/components/DetailSection';
import InlineEdit from '@/components/InlineEdit';
import EmptyState from '@/components/EmptyState';
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDelete = async () => {
    await onDelete(tag);
    setConfirmingDelete(false);
  };

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <InlineEdit
            value={tag}
            onSave={(v) => onRename(tag, v)}
            placeholder="Tag name..."
            validate={(v) => {
              if (!v.trim()) return 'Tag name is required';
              if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.trim()))
                return 'Must be kebab-case (e.g. my-tag-name)';
              return null;
            }}
          />
          <button className={s.modalClose} onClick={onClose}>&times;</button>
        </div>

        <div className={s.actions}>
          {confirmingDelete ? (
            <ConfirmDialog
              message={`Delete tag "${tag}" from all claims?`}
              confirmLabel="Delete"
              onConfirm={handleDelete}
              onCancel={() => setConfirmingDelete(false)}
              variant="danger"
            />
          ) : (
            <button className={s.dangerBtn} onClick={() => setConfirmingDelete(true)}>
              Delete
            </button>
          )}
        </div>

        <hr className={s.divider} />

        <DetailSection label="Claims" count={claims.length}>
          {claimsLoading ? (
            <div className={s.loading}>Loading claims...</div>
          ) : claims.length === 0 ? (
            <EmptyState message="No claims with this tag" />
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
        </DetailSection>
      </div>
    </div>
  );
}
