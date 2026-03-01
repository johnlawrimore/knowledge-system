import { Suspense } from 'react';
import ContributorsContent from './Content';

export default function ContributorsPage() {
  return (
    <Suspense>
      <ContributorsContent />
    </Suspense>
  );
}
