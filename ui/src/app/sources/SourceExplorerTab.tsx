'use client';

import { useEffect, useState } from 'react';
import SourceContentGraph from '@/components/SourceContentGraph';
import EmptyState from '@/components/EmptyState';
import type { SourceGraphData } from '@/lib/types';

interface SourceExplorerTabProps {
  sourceId: number;
  sourceTitle: string;
  sourceType: string;
}

export default function SourceExplorerTab({
  sourceId,
  sourceTitle,
  sourceType,
}: SourceExplorerTabProps) {
  const [data, setData] = useState<SourceGraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sources/${sourceId}/graph`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sourceId]);

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading graph...</div>;

  if (!data || !data.claims) return <EmptyState message="Failed to load graph data" variant="tab" />;

  if (data.claims.length === 0) {
    return <EmptyState message="No content entities to visualize" variant="tab" />;
  }

  return (
    <SourceContentGraph
      sourceId={sourceId}
      sourceTitle={sourceTitle}
      sourceType={sourceType}
      data={data}
    />
  );
}
