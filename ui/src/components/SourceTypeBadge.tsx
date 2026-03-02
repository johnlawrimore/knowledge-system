import { sourceTypeLabel, sourceTypeIcon } from '@/lib/sourceTypes';
import s from './SourceTypeBadge.module.scss';

interface SourceTypeBadgeProps {
  type: string;
  size?: number;
}

export default function SourceTypeBadge({ type, size = 14 }: SourceTypeBadgeProps) {
  const Icon = sourceTypeIcon(type);
  return (
    <span className={s.badge}>
      <Icon size={size} stroke={1.5} className={s.icon} />
      <span>{sourceTypeLabel(type)}</span>
    </span>
  );
}
