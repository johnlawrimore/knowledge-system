import s from './ConfidenceBadge.module.scss';

const styleMap: Record<string, string> = {
  strong: s.strong,
  moderate: s.moderate,
  developing: s.developing,
  contested: s.contested,
  unsupported: s.unsupported,
};

export default function ConfidenceBadge({
  confidence,
  score,
}: {
  confidence: string | null | undefined;
  score?: number | null;
}) {
  const level = confidence || 'unsupported';
  const cls = styleMap[level] || s.developing;
  return (
    <span className={cls}>
      {level.toUpperCase()}
      {score != null && <span className={s.score}>({score})</span>}
    </span>
  );
}
