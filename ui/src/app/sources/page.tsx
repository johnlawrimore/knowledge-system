import { Suspense } from 'react';
import SourcesContent from './Content';

export default function SourcesPage() {
  return (
    <Suspense>
      <SourcesContent />
    </Suspense>
  );
}
