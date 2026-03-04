'use client';

import ClaimGraph from '@/components/ClaimGraph';
import type { ClaimDetail } from '@/lib/types';
import s from '../page.module.scss';

interface ClaimRelationshipsTabProps {
  claim: ClaimDetail;
}

export default function ClaimRelationshipsTab({ claim }: ClaimRelationshipsTabProps) {
  const connectionsCount =
    (claim.parent_claim ? 1 : 0) + claim.children.length + claim.links.length;

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
          links={claim.links}
        />
      ) : (
        <div className={s.emptyTab}>No connections — this claim has no parent, children, or links</div>
      )}
    </>
  );
}
