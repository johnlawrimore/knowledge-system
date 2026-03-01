'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import s from './Sidebar.module.scss';

interface PipelineStats {
  collected: number;
  distilled: number;
  decomposed: number;
}

const primaryNav = [
  { href: '/', label: 'Dashboard', icon: '◆' },
  { href: '/claims', label: 'Claims', icon: '◆' },
];

const secondaryNav = [
  { href: '/sources', label: 'Sources' },
  { href: '/artifacts', label: 'Artifacts' },
  { href: '/evidence', label: 'Evidence' },
  { href: '/topics', label: 'Topics' },
  { href: '/themes', label: 'Themes' },
  { href: '/tags', label: 'Tags' },
  { href: '/contributors', label: 'Contributors' },
  { href: '/clusters', label: 'Clusters' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState<PipelineStats | null>(null);
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

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => setStats(d.pipeline))
      .catch(() => {});
  }, [pathname]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside className={s.sidebar}>
      <div className={s.header}>
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

      {stats && (
        <div className={s.pipelineFooter}>
          <div className={s.pipelineLabel}>Pipeline</div>
          <div className={s.pipelineCounts}>
            <span className={s.countCollected}>{stats.collected}</span>/
            <span className={s.countDistilled}>{stats.distilled}</span>/
            <span className={s.countDecomposed}>{stats.decomposed}</span>
          </div>
          <div className={s.pipelineLegend}>collected / distilled / decomposed</div>
        </div>
      )}

      <button className={s.themeToggle} onClick={toggleTheme}>
        <span>{theme === 'dark' ? '\u263E' : '\u2600'}</span>
        <span className={s.themeToggleLabel}>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </span>
      </button>
    </aside>
  );
}
