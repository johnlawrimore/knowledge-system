import { Suspense } from 'react';
import CompositionsContent from './Content';

export default function CompositionsPage() {
  return (
    <Suspense>
      <CompositionsContent />
    </Suspense>
  );
}
