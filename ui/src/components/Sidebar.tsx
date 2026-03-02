'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import s from './Sidebar.module.scss';

const primaryNav = [
  { href: '/', label: 'Dashboard', icon: '◆' },
  { href: '/claims', label: 'Claims', icon: '◆' },
];

const secondaryNav = [
  { href: '/sources', label: 'Sources' },
  { href: '/compositions', label: 'Compositions' },
  { href: '/evidence', label: 'Evidence' },
  { href: '/topics', label: 'Topics' },
  { href: '/themes', label: 'Themes' },
  { href: '/tags', label: 'Tags' },
  { href: '/contributors', label: 'Contributors' },
  { href: '/clusters', label: 'Clusters' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const current = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    setTheme(current);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(next);
    localStorage.setItem('theme', next);
    setTheme(next);
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside className={s.sidebar}>
      <div className={s.header}>
        <Image src="/logo.png" alt="Logo" width={28} height={28} />
        <h1>KNOWLEDGE BASE</h1>
      </div>

      <nav className={s.nav}>
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? s.navLinkActive : s.navLink}
          >
            <span className={s.navIcon}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className={s.spacer} />

        {secondaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? s.navLinkActive : s.navLink}
          >
            <span className={s.navIconSecondary}>◇</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <button className={s.themeToggle} onClick={toggleTheme}>
        <span>{theme === 'dark' ? '\u263E' : '\u2600'}</span>
        <span className={s.themeToggleLabel}>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </span>
      </button>
    </aside>
  );
}
