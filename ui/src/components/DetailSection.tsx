import { ReactNode } from 'react';
import s from './DetailSection.module.scss';

interface DetailSectionProps {
  label: string;
  count?: number;
  children: ReactNode;
}

export default function DetailSection({ label, count, children }: DetailSectionProps) {
  return (
    <div className={s.section}>
      <div className={s.label}>
        {label}
        {count != null && <span className={s.count}> ({count})</span>}
      </div>
      {children}
    </div>
  );
}
