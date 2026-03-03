import { Suspense } from 'react';
import FiltersContent from './Content';

export default function FiltersPage() {
  return (
    <Suspense>
      <FiltersContent />
    </Suspense>
  );
}
