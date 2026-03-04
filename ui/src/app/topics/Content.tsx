'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { pageIcon } from '@/lib/pageIcons';
import { TopicNode, TopicDetail } from '@/lib/types';
import TopicFlow from './TopicFlow';
import TopicTree from './TopicTree';
import TopicDetailPanel from './TopicDetailPanel';
import s from '../shared.module.scss';

const TopicsIcon = pageIcon('topics');

export default function TopicsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topics, setTopics] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TopicDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedId = searchParams.get('id');

  const selectTopic = useCallback(
    (id: number | null) => {
      if (id === null) {
        router.push('/topics');
      } else {
        router.push(`/topics?id=${id}`);
      }
    },
    [router]
  );

  useEffect(() => {
    setLoading(true);
    fetch('/api/topics')
      .then((r) => r.json())
      .then((d) => {
        const list = d.topics || [];
        setTopics(list);
        if (!selectedId && list.length > 0) {
          router.replace(`/topics?id=${list[0].id}`);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    fetch(`/api/topics/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(console.error)
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}><TopicsIcon size={32} stroke={2} className={s.pageIcon} />Topics</h1>
      </div>

      {loading ? (
        <div className={s.loading}>Loading topics...</div>
      ) : (
        <div className={s.splitLayout}>
          <div className={s.listPanel}>
            {topics.length === 0 ? (
              <div className={s.empty}>No topics found</div>
            ) : (
              <TopicTree
                topics={topics}
                selectedId={selectedId ? Number(selectedId) : null}
                onSelect={selectTopic}
              />
            )}
          </div>

          <div className={s.detailPanel}>
            <TopicFlow
              topics={topics}
              selectedId={selectedId}
              onSelect={selectTopic}
            />

            {detailLoading ? (
              <div className={s.loading}>Loading topic...</div>
            ) : detail ? (
              <TopicDetailPanel detail={detail} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
