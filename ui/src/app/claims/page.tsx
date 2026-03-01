import { Suspense } from 'react';
import ClaimsContent from './Content';

export default function ClaimsPage() {
  return (
    <Suspense>
      <ClaimsContent />
    </Suspense>
  );
}
