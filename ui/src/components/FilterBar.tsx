import { ReactNode } from 'react';
import s from './FilterBar.module.scss';

// Re-export class names for consumers to use on their <select> and <input> elements
export const filterStyles = s;

interface FilterBarProps {
  children: ReactNode;
}

export default function FilterBar({ children }: FilterBarProps) {
  return <div className={s.filters}>{children}</div>;
}
