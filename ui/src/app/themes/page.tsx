'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { pageIcon } from '@/lib/pageIcons';
import s from '../shared.module.scss';

const ThemesIcon = pageIcon('themes');

interface Theme {
  id: number;
  name: string;
  thesis: string | null;
  claim_count: number;
  topics_spanned: number;
  avg_claim_score: number | null;
  well_supported_claims: number;
  contested_claims: number;
}

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/themes')
      .then((r) => r.json())
      .then((d) => setThemes(d.themes || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function truncate(text: string | null, max: number): string {
    if (!text) return '';
    if (text.length <= max) return text;
    return text.slice(0, max).trimEnd() + '...';
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}><ThemesIcon size={32} stroke={2} className={s.pageIcon} />Themes</h1>
        <button className={s.createBtn} onClick={() => {}}>
          + Create
        </button>
      </div>

      {loading ? (
        <div className={s.loading}>Loading themes...</div>
      ) : themes.length === 0 ? (
        <div className={s.empty}>No themes found</div>
      ) : (
        <div className={s.cardList}>
          {themes.map((theme) => (
            <div key={theme.id} className={s.card}>
              <div className={s.cardTitle}>{theme.name}</div>
              {theme.thesis && (
                <div className={s.cardBody}>{truncate(theme.thesis, 200)}</div>
              )}
              <div className={s.cardMeta}>
                {theme.claim_count} claims
                &middot; {theme.topics_spanned} topics spanned
                {theme.avg_claim_score != null && (
                  <> &middot; avg score: {Number(theme.avg_claim_score).toFixed(1)}</>
                )}
                {theme.well_supported_claims > 0 && (
                  <> &middot; {theme.well_supported_claims} well-supported</>
                )}
                {theme.contested_claims > 0 && (
                  <> &middot; {theme.contested_claims} contested</>
                )}
              </div>
              <Link href={`/claims?theme=${theme.id}`} className={s.cardLink}>
                View claims &rarr;
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
