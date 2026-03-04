'use client';

import { ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';
import s from './Modal.module.scss';

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>{title}</span>
          <button className={s.modalClose} onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
