import Link from 'next/link';
import { abstractionLevelLabel, assumedExpertiseLabel } from '@/lib/enumLabels';
import s from './CardSourceFooter.module.scss';

interface CardSourceFooterProps {
  sourceId: number;
  sourceTitle: string;
  contributors?: string | null;
  abstractionLevel?: string | null;
  assumedExpertise?: string | null;
}

export default function CardSourceFooter({
  sourceId,
  sourceTitle,
  contributors,
  abstractionLevel,
  assumedExpertise,
}: CardSourceFooterProps) {
  return (
    <div className={s.footer}>
      <div className={s.row}>
        <span>
          <span className={s.label}>Source</span>{' '}
          <Link href={`/sources?id=${sourceId}`} className={s.link}>{sourceTitle}</Link>
          {contributors && ` (${contributors})`}
        </span>
      </div>
      {(abstractionLevel || assumedExpertise) && (
        <div className={s.row}>
          {abstractionLevel && (
            <span><span className={s.label}>Abstraction</span> {abstractionLevelLabel(abstractionLevel)}</span>
          )}
          {assumedExpertise && (
            <span><span className={s.label}>Expertise</span> {assumedExpertiseLabel(assumedExpertise)}</span>
          )}
        </div>
      )}
    </div>
  );
}
