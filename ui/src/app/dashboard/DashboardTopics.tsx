import Link from 'next/link';
import ScoreRing from '@/components/ScoreRing';
import { DashboardData } from '@/lib/types';
import s from '../page.module.scss';

export default function DashboardTopics({
  topics,
}: {
  topics: DashboardData['topicCoverage'];
}) {
  const maxTopicCount = Math.max(...topics.map((t) => t.claim_count), 1);

  return (
    <div className={s.panel}>
      <div className={s.panelTitle}>Topic Coverage</div>
      {topics.length === 0 ? (
        <div className={s.empty}>No topics yet</div>
      ) : (
        topics.map((t) => (
          <Link key={t.topic_id} href={`/topics?id=${t.topic_id}`} className={s.topicRow}>
            <span className={s.topicName}>{t.topic_name}</span>
            <div className={s.topicBar}>
              <div className={s.topicBarFill} style={{ width: `${(t.claim_count / maxTopicCount) * 100}%` }} />
            </div>
            <span className={s.topicCount}>{t.claim_count}</span>
            <span className={s.topicScore}>
              <ScoreRing value={t.avg_claim_score != null ? Math.round(t.avg_claim_score) : null} size={28} />
            </span>
          </Link>
        ))
      )}
    </div>
  );
}
