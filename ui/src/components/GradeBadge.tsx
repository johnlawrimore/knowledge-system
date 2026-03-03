import { gradeLabel } from '@/lib/enumLabels';
import s from './GradeBadge.module.scss';

const gradeClass: Record<string, string> = {
  A: s.gradeA,
  B: s.gradeB,
  C: s.gradeC,
  D: s.gradeD,
  F: s.gradeF,
};

export default function GradeBadge({
  grade,
}: {
  grade: string | null | undefined;
}) {
  if (!grade) return null;
  const cls = gradeClass[grade] || gradeClass.C;
  return (
    <span className={cls}>
      {grade} &middot; {gradeLabel(grade)}
    </span>
  );
}
