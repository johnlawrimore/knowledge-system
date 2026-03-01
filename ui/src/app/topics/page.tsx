import { Suspense } from 'react';
import TopicsContent from './Content';

export default function TopicsPage() {
  return (
    <Suspense>
      <TopicsContent />
    </Suspense>
  );
}
