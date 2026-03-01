import Link from 'next/link';
import s from './LinkChip.module.scss';

const kindMap: Record<string, string> = {
  topic: s.topic,
  theme: s.theme,
  tag: s.tag,
  source: s.source,
  contributor: s.contributor,
  claim: s.claim,
  cluster: s.cluster,
};

export default function LinkChip({
  href,
  label,
  kind = 'default',
  onRemove,
}: {
  href?: string;
  label: string;
  kind?: string;
  onRemove?: () => void;
}) {
  const cls = kindMap[kind] || s.default;
  const inner = (
    <span className={cls}>
      {label}
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className={s.removeBtn}
        >
          &times;
        </button>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={s.chipLink}>
        {inner}
      </Link>
    );
  }
  return inner;
}
