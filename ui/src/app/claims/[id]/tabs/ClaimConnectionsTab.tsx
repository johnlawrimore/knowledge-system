'use client';

import ClaimGraph from '@/components/ClaimGraph';
import type { ClaimDetail } from '@/lib/types';
import s from '../page.module.scss';

interface ClaimConnectionsTabProps {
  claim: ClaimDetail;
}

export default function ClaimConnectionsTab({ claim }: ClaimConnectionsTabProps) {
  const connectionsCount =
    (claim.parent_claim ? 1 : 0) + claim.children.length + claim.relationships.length;

  return (
    <>
      {connectionsCount > 0 ? (
        <ClaimGraph
          focalId={claim.id}
          focalStatement={claim.statement}
          focalType={claim.claim_type}
          focalConfidence={claim.computed_confidence}
          focalScore={claim.score}
          parent={claim.parent_claim}
          children={claim.children}
          relationships={claim.relationships}
        />
      ) : (
        <div className={s.emptyTab}>No connections — this claim has no parent, children, or relationships</div>
      )}
    </>
  );
}
