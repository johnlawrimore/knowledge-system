'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import s from './Sidebar.module.scss';

const navItems = [
  { href: '/', label: 'Dashboard', separatorAfter: true },
  { href: '/sources', label: 'Sources' },
  { href: '/contributors', label: 'Contributors', separatorAfter: true },
  { href: '/claims', label: 'Claims' },
  { href: '/evidence', label: 'Evidence' },
  { href: '/topics', label: 'Topics' },
  { href: '/themes', label: 'Themes' },
  { href: '/tags', label: 'Tags', separatorAfter: true },
  { href: '/compositions', label: 'Compositions' },
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
        <Image src="/logo.png" alt="Logo" width={42} height={42} />
        <h1 className={s.siteTitle}>KNOWLEDGE<span className={s.siteTitleAccent}>BASE</span></h1>
      </div>

      <nav className={s.nav}>
        {navItems.map((item) => (
          <React.Fragment key={item.href}>
            <Link
              href={item.href}
              className={isActive(item.href) ? s.navLinkActive : s.navLink}
            >
              {item.label}
            </Link>
            {item.separatorAfter && <div className={s.separator} />}
          </React.Fragment>
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
