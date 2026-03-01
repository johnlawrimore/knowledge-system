import { Suspense } from 'react';
import EvidenceContent from './Content';

export default function EvidencePage() {
  return (
    <Suspense>
      <EvidenceContent />
    </Suspense>
  );
}
