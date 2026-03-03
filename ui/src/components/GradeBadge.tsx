import {
  IconCircleLetterAFilled,
  IconCircleLetterBFilled,
  IconCircleLetterCFilled,
  IconCircleLetterDFilled,
  IconCircleLetterFFilled
} from '@tabler/icons-react';
import { gradeLabel } from '@/lib/enumLabels';
import s from './GradeBadge.module.scss';

const gradeClass: Record<string, string> = {
  A: s.gradeA,
  B: s.gradeB,
  C: s.gradeC,
  D: s.gradeD,
  F: s.gradeF,
};

const gradeIcon: Record<string, typeof IconCircleLetterAFilled> = {
  A: IconCircleLetterAFilled,
  B: IconCircleLetterBFilled,
  C: IconCircleLetterCFilled,
  D: IconCircleLetterDFilled,
  F: IconCircleLetterFFilled,
};

export default function GradeBadge({
  grade,
}: {
  grade: string | null | undefined;
}) {
  if (!grade) return null;
  const cls = gradeClass[grade] || gradeClass.C;
  const Icon = gradeIcon[grade] || IconCircleLetterCFilled;
  return (
    <span className={cls}>
      {gradeLabel(grade)}
      <Icon size={28} stroke={2} />
    </span>
  );
}
