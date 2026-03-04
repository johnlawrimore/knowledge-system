import s from './StanceStats.module.scss';

interface StanceStatsProps {
  supports?: number;
  contradicts?: number;
  qualifies?: number;
}

export default function StanceStats({ supports, contradicts, qualifies }: StanceStatsProps) {
  return (
    <div className={s.stats}>
      {!!supports && <span className={s.supports}>{supports} supporting</span>}
      {!!contradicts && <span className={s.contradicts}>{contradicts} contradicting</span>}
      {!!qualifies && <span className={s.qualifies}>{qualifies} qualifying</span>}
    </div>
  );
}
