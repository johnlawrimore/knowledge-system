'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import s from './page.module.scss';

interface DashboardData {
  pipeline: Record<string, number>;
  attention: { label: string; count: number }[];
  topicCoverage: { topic_id: number; topic_name: string; claim_count: number; avg_claim_score: number }[];
  themeStrength: { theme_id: number; theme_name: string; claim_count: number; avg_claim_score: number }[];
  counts: { sources: number; claims: number; evidence: number; avgCredibility: number };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return <div className={s.loading}>Loading dashboard...</div>;

  const totalSources = Object.values(data.pipeline).reduce((a, b) => a + b, 0);
  const pipelinePcts = totalSources > 0
    ? {
        collected: ((data.pipeline.collected || 0) + (data.pipeline.distilling || 0)) / totalSources * 100,
        distilled: ((data.pipeline.distilled || 0) + (data.pipeline.decomposing || 0)) / totalSources * 100,
        decomposed: (data.pipeline.decomposed || 0) / totalSources * 100,
      }
    : { collected: 0, distilled: 0, decomposed: 0 };

  const maxTopicCount = Math.max(...data.topicCoverage.map((t) => t.claim_count), 1);

  return (
    <div className={s.dashboard}>
      <h1 className={s.title}>Dashboard</h1>

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statLabel}>Sources</div>
          <div className={s.statValue}>{data.counts.sources}</div>
          <div className={s.pipelineBar}>
            <div className={`${s.pipelineSegment} ${s.segCollected}`} style={{ width: `${pipelinePcts.collected}%` }} />
            <div className={`${s.pipelineSegment} ${s.segDistilled}`} style={{ width: `${pipelinePcts.distilled}%` }} />
            <div className={`${s.pipelineSegment} ${s.segDecomposed}`} style={{ width: `${pipelinePcts.decomposed}%` }} />
          </div>
          <div className={s.statDetail}>
            {data.pipeline.collected || 0} collected / {data.pipeline.distilled || 0} distilled / {data.pipeline.decomposed || 0} decomposed
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statLabel}>Claims</div>
          <div className={s.statValue}>{data.counts.claims}</div>
        </div>

        <div className={s.statCard}>
          <div className={s.statLabel}>Evidence</div>
          <div className={s.statValue}>{data.counts.evidence}</div>
          <div className={s.statDetail}>
            avg credibility: {data.counts.avgCredibility?.toFixed(1) ?? 'n/a'}
          </div>
        </div>
      </div>

      {data.attention.length > 0 && (
        <>
          <div className={s.sectionTitle}>What Needs Attention</div>
          <div className={s.attentionList}>
            {data.attention.filter((a) => a.count > 0).map((item, i) => (
              <div key={i} className={s.attentionItem}>
                <span className={`${s.attentionIcon} ${i < 2 ? s.iconWarning : s.iconInfo}`}>
                  {i < 2 ? '!' : '-'}
                </span>
                {item.label}
                <span className={s.attentionCount}>{item.count}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={s.bottomGrid}>
        <div className={s.panel}>
          <div className={s.panelTitle}>Topic Coverage</div>
          {data.topicCoverage.length === 0 ? (
            <div className={s.empty}>No topics yet</div>
          ) : (
            data.topicCoverage.map((t) => (
              <Link key={t.topic_id} href={`/topics?id=${t.topic_id}`} className={s.topicRow}>
                <span className={s.topicName}>{t.topic_name}</span>
                <div className={s.topicBar}>
                  <div className={s.topicBarFill} style={{ width: `${(t.claim_count / maxTopicCount) * 100}%` }} />
                </div>
                <span className={s.topicCount}>{t.claim_count}</span>
              </Link>
            ))
          )}
        </div>

        <div className={s.panel}>
          <div className={s.panelTitle}>Theme Strength</div>
          {data.themeStrength.length === 0 ? (
            <div className={s.empty}>No themes yet</div>
          ) : (
            data.themeStrength.map((t) => (
              <Link key={t.theme_id} href={`/themes?id=${t.theme_id}`} className={s.themeRow}>
                <div className={s.themeName}>{t.theme_name}</div>
                <div className={s.themeMeta}>
                  {t.claim_count} claims, avg {t.avg_claim_score?.toFixed(1) ?? 'n/a'}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
