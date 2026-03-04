'use client';

import { useEffect, useState } from 'react';
import { pageIcon } from '@/lib/pageIcons';
import { DashboardData } from '@/lib/types';
import DashboardCounts from './dashboard/DashboardCounts';
import DashboardDistributions from './dashboard/DashboardDistributions';
import DashboardTopics from './dashboard/DashboardTopics';
import DashboardThemes from './dashboard/DashboardThemes';
import DashboardContributors from './dashboard/DashboardContributors';
import DashboardThinClaims from './dashboard/DashboardThinClaims';
import s from './page.module.scss';

const DashboardIcon = pageIcon('dashboard');

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return <div className={s.loading}>Loading dashboard...</div>;

  return (
    <div className={s.dashboard}>
      <h1 className={s.title}>
        <DashboardIcon size={32} stroke={2} className={s.pageIcon} />
        Dashboard
      </h1>

      {/* ── Stat Cards ──────────────────────────────────────────── */}
      <DashboardCounts counts={data.counts} distributions={data.distributions} />

      {/* ── Evaluation Averages ─────────────────────────────────── */}
      <DashboardDistributions evalAverages={data.evalAverages} />

      {/* ── Main Content Grid ───────────────────────────────────── */}
      <div className={s.contentGrid}>
        {/* Left column */}
        <div className={s.column}>
          <DashboardTopics topics={data.topicCoverage} />
          <DashboardContributors contributors={data.topContributors} />
        </div>

        {/* Right column */}
        <div className={s.column}>
          <DashboardThemes themes={data.themeStrength} />
          <DashboardThinClaims claims={data.thinClaims} total={data.thinClaimsTotal} />
        </div>
      </div>
    </div>
  );
}
