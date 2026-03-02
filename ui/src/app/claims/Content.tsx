'use client';
import { useState } from 'react';
import ClaimsList from '@/components/ClaimsList';
import ClustersList from '@/components/ClustersList';
import s from './page.module.scss';

export default function ClaimsContent() {
  const [tab, setTab] = useState<'claims' | 'clusters'>('claims');

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Claims</h1>
      </div>

      <div className={s.tabs}>
        <button
          className={tab === 'claims' ? s.tabActive : s.tab}
          onClick={() => setTab('claims')}
        >
          Claims
        </button>
        <button
          className={tab === 'clusters' ? s.tabActive : s.tab}
          onClick={() => setTab('clusters')}
        >
          Clusters
        </button>
      </div>

      {tab === 'claims' ? <ClaimsList /> : <ClustersList />}
    </div>
  );
}
