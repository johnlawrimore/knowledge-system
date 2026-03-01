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
  confidence: string;
  score?: number | null;
}) {
  const cls = styleMap[confidence] || s.developing;
  return (
    <span className={cls}>
      {confidence.toUpperCase()}
      {score != null && <span className={s.score}>({score})</span>}
    </span>
  );
}
