import { IconStarFilled } from '@tabler/icons-react';
import s from './KeyBadge.module.scss';

export default function KeyBadge() {
  return (
    <span className={s.badge} title="Key claim for this source">
      <IconStarFilled size={12} />
    </span>
  );
}
