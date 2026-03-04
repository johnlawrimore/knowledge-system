import Link from 'next/link';
import s from './LinkedList.module.scss';

interface LinkedListProps {
  items: { id: number | string; title: string; href: string }[];
}

export default function LinkedList({ items }: LinkedListProps) {
  return (
    <div className={s.list}>
      {items.map((item) => (
        <Link key={item.id} href={item.href} className={s.item}>
          {item.title}
        </Link>
      ))}
    </div>
  );
}
