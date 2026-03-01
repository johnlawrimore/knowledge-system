'use client';

import { Suspense } from 'react';

export default function ClientPage({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
