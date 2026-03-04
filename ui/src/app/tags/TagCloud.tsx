'use client';

import { TagItem, TagGroup } from '@/lib/types';
import s from '../shared.module.scss';

function tagTierClass(count: number): string {
  if (count >= 11) return s.tagTier4;
  if (count >= 6) return s.tagTier3;
  if (count >= 2) return s.tagTier2;
  return s.tagItem;
}

export default function TagCloud({
  groups,
  selectedTag,
  onSelect,
}: {
  groups: TagGroup[];
  selectedTag: string | null;
  onSelect: (tag: string) => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.prefix} className={s.tagGroup}>
          <div className={s.tagGroupTitle}>{group.prefix}</div>
          <div className={s.tagGrid}>
            {group.tags.map((t) => (
              <span
                key={t.tag}
                className={t.tag === selectedTag ? s.tagItemActive : tagTierClass(t.claim_count)}
                onClick={() => onSelect(t.tag)}
              >
                {t.tag}
                <span className={s.tagCount}>{t.claim_count}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
