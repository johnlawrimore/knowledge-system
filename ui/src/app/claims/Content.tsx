'use client';
import ClaimsList from '@/components/ClaimsList';
import s from './page.module.scss';

export default function ClaimsContent() {
  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Claims</h1>
      </div>
      <ClaimsList />
    </div>
  );
}
