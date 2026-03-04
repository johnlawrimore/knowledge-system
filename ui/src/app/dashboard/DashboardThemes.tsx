import Link from 'next/link';
import ScoreRing from '@/components/ScoreRing';
import { DashboardData } from '@/lib/types';
import s from '../page.module.scss';

export default function DashboardThemes({
  themes,
}: {
  themes: DashboardData['themeStrength'];
}) {
  return (
    <div className={s.panel}>
      <div className={s.panelTitle}>Progressing Themes</div>
      {themes.length === 0 ? (
        <div className={s.empty}>No themes yet</div>
      ) : (
        themes.map((t) => (
          <Link key={t.theme_id} href={`/themes?id=${t.theme_id}`} className={s.themeRow}>
            <div className={s.themeTop}>
              <div className={s.themeInfo}>
                <div className={s.themeName}>{t.theme_name}</div>
                {t.thesis && <div className={s.themeThesis}>{t.thesis}</div>}
                <div className={s.themeMeta}>
                  <span>{t.claim_count} claims</span>
                  <span>{t.topics_spanned} topics</span>
                  {t.well_supported_claims > 0 && (
                    <span className={s.themeMetaGreen}>{t.well_supported_claims} supported</span>
                  )}
                  {t.contested_claims > 0 && (
                    <span className={s.themeMetaOrange}>{t.contested_claims} contested</span>
                  )}
                </div>
              </div>
              <span className={s.themeScore}>
                <ScoreRing value={t.avg_claim_score != null ? Math.round(t.avg_claim_score) : null} size={32} />
              </span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
