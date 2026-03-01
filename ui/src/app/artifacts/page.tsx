import { Suspense } from 'react';
import ArtifactsContent from './Content';

export default function ArtifactsPage() {
  return (
    <Suspense>
      <ArtifactsContent />
    </Suspense>
  );
}
