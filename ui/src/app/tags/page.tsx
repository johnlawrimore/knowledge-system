import { Suspense } from 'react';
import TagsContent from './Content';

export default function TagsPage() {
  return (
    <Suspense>
      <TagsContent />
    </Suspense>
  );
}
