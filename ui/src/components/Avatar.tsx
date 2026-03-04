import { getInitials } from '@/lib/stringUtils';
import s from './Avatar.module.scss';

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
}

export default function Avatar({ name, url, size = 28, className }: AvatarProps) {
  return (
    <span
      className={`${s.avatar}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" className={s.img} />
      ) : (
        <span className={s.placeholder} style={{ fontSize: size * 0.36 }}>
          {getInitials(name)}
        </span>
      )}
    </span>
  );
}
