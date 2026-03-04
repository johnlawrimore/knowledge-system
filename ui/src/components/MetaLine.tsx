import { ReactNode, Children } from 'react';
import s from './MetaLine.module.scss';

interface MetaLineProps {
  children: ReactNode;
  className?: string;
}

export default function MetaLine({ children, className }: MetaLineProps) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <div className={`${s.meta}${className ? ` ${className}` : ''}`}>
      {items.map((child, i) => (
        <span key={i}>
          {i > 0 && <span className={s.separator}> · </span>}
          {child}
        </span>
      ))}
    </div>
  );
}
