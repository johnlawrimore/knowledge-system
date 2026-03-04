import s from './EmptyState.module.scss';

interface EmptyStateProps {
  message: string;
  variant?: 'list' | 'detail' | 'tab';
}

export default function EmptyState({ message, variant = 'list' }: EmptyStateProps) {
  return <div className={s[variant]}>{message}</div>;
}
