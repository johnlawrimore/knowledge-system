'use client';

import s from './ConfirmDialog.module.scss';

export default function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  variant = 'danger',
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
}) {
  return (
    <div className={variant === 'danger' ? s.confirmBox : s.confirmBoxDefault}>
      <div className={s.confirmText}>{message}</div>
      <div className={s.confirmActions}>
        <button className={s.confirmCancel} onClick={onCancel}>
          Cancel
        </button>
        <button
          className={variant === 'danger' ? s.confirmBtn : s.confirmBtnDefault}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
