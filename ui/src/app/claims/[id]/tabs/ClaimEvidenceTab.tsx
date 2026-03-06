'use client';

import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import StrengthMeter from '@/components/StrengthMeter';
import { stanceLabel, evidenceTypeLabel, reasoningTypeLabel, abstractionLevelLabel, assumedExpertiseLabel } from '@/lib/enumLabels';
import type { Evidence, Reasoning } from '@/lib/types';
import s from '../page.module.scss';

const stanceStyles: Record<string, { card: string; badge: string }> = {
  supporting:    { card: s.evidenceSupports,    badge: s.stanceSupports },
  contradicting: { card: s.evidenceContradicts, badge: s.stanceContradicts },
  qualifying:    { card: s.evidenceQualifies,   badge: s.stanceQualifies },
};

interface ClaimEvidenceTabProps {
  evidence: Evidence[];
  reasonings: Reasoning[];
}

export default function ClaimEvidenceTab({ evidence, reasonings }: ClaimEvidenceTabProps) {
  // Group reasonings by evidence_id for nesting under evidence cards
  const reasoningsByEvidence = reasonings.reduce<Record<number, Reasoning[]>>((acc, r) => {
    if (!acc[r.evidence_id]) acc[r.evidence_id] = [];
    acc[r.evidence_id].push(r);
    return acc;
  }, {});

  if (evidence.length === 0) {
    return <EmptyState message="No evidence yet — this claim needs sources" variant="tab" />;
  }

  return (
    <div className={s.cardList}>
      {evidence.map((ev) => {
        const ss = stanceStyles[ev.stance] || stanceStyles.supporting;
        return (
          <div key={ev.id} className={`${s.evidenceCard} ${ss.card}`}>
            <div className={s.evidenceHeader}>
              <div className={s.evidenceHeaderLeft}>
                <span>{evidenceTypeLabel(ev.evidence_type)}</span>
                <span>&middot;</span>
                <span className={`${s.stanceBadge} ${ss.badge}`}>{stanceLabel(ev.stance)}</span>
              </div>
              {ev.strength != null && (
                <StrengthMeter strength={ev.strength} notes={ev.strength_notes} />
              )}
            </div>
            <div className={s.cardContent}>{ev.content}</div>
            {reasoningsByEvidence[ev.id] && reasoningsByEvidence[ev.id].length > 0 && (
              <>
                <div className={s.reasoningHeader}>Reasoning</div>
                {reasoningsByEvidence[ev.id].map((r) => (
                  <div key={r.id} className={s.cardNote}>
                    <span className={s.reasoningType}>{reasoningTypeLabel(r.reasoning_type)}</span>
                    {r.content}
                  </div>
                ))}
              </>
            )}
            <div className={s.cardMeta}>
              <span>
                <span className={s.cardMetaLabel}>Source</span>{' '}
                <Link href={`/sources?id=${ev.source_id}`} className={s.cardSourceLink}>{ev.source_title}</Link>
                {ev.contributors && ` (${ev.contributors})`}
              </span>
            </div>
            {(ev.abstraction_level || ev.assumed_expertise) && (
              <div className={s.cardMeta}>
                {ev.abstraction_level && (
                  <span><span className={s.cardMetaLabel}>Abstraction</span> {abstractionLevelLabel(ev.abstraction_level)}</span>
                )}
                {ev.assumed_expertise && (
                  <span><span className={s.cardMetaLabel}>Expertise</span> {assumedExpertiseLabel(ev.assumed_expertise)}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
