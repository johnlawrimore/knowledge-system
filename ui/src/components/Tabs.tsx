'use client';

import s from './Tabs.module.scss';

interface TabDef {
  key: string;
  label: string;
  count?: number;
}

export default function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className={s.contentTabs}>
      {tabs.map((t) => (
        <button
          key={t.key}
          className={active === t.key ? s.contentTabActive : s.contentTab}
          onClick={() => onChange(t.key)}
        >
          {t.label}
          {t.count != null && t.count > 0 && (
            <span className={s.tabBadge}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
