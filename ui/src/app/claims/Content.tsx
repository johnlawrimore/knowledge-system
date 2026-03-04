'use client';
import { useSearchParams } from 'next/navigation';
import ClaimsList from '@/components/ClaimsList';
import { pageIcon } from '@/lib/pageIcons';
import s from './page.module.scss';

const ClaimsIcon = pageIcon('claims');

export default function ClaimsContent() {
  const searchParams = useSearchParams();
  const topicParam = searchParams.get('topic');
  const initialTopicId = topicParam ? Number(topicParam) : undefined;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}><ClaimsIcon size={32} stroke={2} className={s.pageIcon} />Claims</h1>
      </div>
      <ClaimsList initialTopicId={initialTopicId} />
    </div>
  );
}
