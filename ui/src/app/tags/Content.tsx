'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import s from '../shared.module.scss';

interface TagItem {
  tag: string;
  claim_count: number;
}

interface ClaimRow {
  id: number;
  statement: string;
  claim_type: string;
  computed_confidence: string;
  score: number;
  supporting_sources: number;
  contradicting_sources: number;
  supporting_evidence: number;
  contradicting_evidence: number;
}

interface TagGroup {
  prefix: string;
  tags: TagItem[];
}

function groupTags(tags: TagItem[]): TagGroup[] {
  // Count how many tags share each first segment (split on "-")
  const prefixCounts = new Map<string, TagItem[]>();
  for (const t of tags) {
    const parts = t.tag.split('-');
    const prefix = parts.length > 1 ? parts[0] : '';
    if (!prefixCounts.has(prefix)) {
      prefixCounts.set(prefix, []);
    }
    prefixCounts.get(prefix)!.push(t);
  }

  const groups: TagGroup[] = [];
  const otherTags: TagItem[] = [];

  for (const [prefix, items] of prefixCounts.entries()) {
    if (prefix && items.length >= 3) {
      groups.push({ prefix, tags: items });
    } else {
      otherTags.push(...items);
    }
  }

  // Sort groups alphabetically
  groups.sort((a, b) => a.prefix.localeCompare(b.prefix));

  if (otherTags.length > 0) {
    groups.push({ prefix: 'other', tags: otherTags });
  }

  return groups;
}

export default function TagsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const selectedTag = searchParams.get('tag');

  const selectTag = useCallback(
    (tag: string) => {
      const params = new URLSearchParams();
      params.set('tag', tag);
      router.push(`/tags?${params.toString()}`);
    },
    [router]
  );

  useEffect(() => {
    setLoading(true);
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d) => setTags(d.tags || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedTag) {
      setClaims([]);
      return;
    }
    setClaimsLoading(true);
    fetch(`/api/tags/${encodeURIComponent(selectedTag)}`)
      .then((r) => r.json())
      .then((d) => setClaims(d.claims || []))
      .catch(console.error)
      .finally(() => setClaimsLoading(false));
  }, [selectedTag]);

  const handleRename = async () => {
    if (!selectedTag || !renameValue.trim()) return;
    const newTag = renameValue.trim();
    try {
      const res = await fetch(`/api/tags/${encodeURIComponent(selectedTag)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newTag }),
      });
      if (res.ok) {
        // Refresh tags list
        const tagsRes = await fetch('/api/tags');
        const tagsData = await tagsRes.json();
        setTags(tagsData.tags || []);
        setRenaming(false);
        // Navigate to the new tag
        router.push(`/tags?tag=${encodeURIComponent(newTag)}`);
      }
    } catch (err) {
      console.error('Failed to rename tag:', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedTag) return;
    if (!confirm(`Delete tag "${selectedTag}" from all claims?`)) return;
    try {
      const res = await fetch(`/api/tags/${encodeURIComponent(selectedTag)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        // Refresh tags list
        const tagsRes = await fetch('/api/tags');
        const tagsData = await tagsRes.json();
        setTags(tagsData.tags || []);
        setClaims([]);
        router.push('/tags');
      }
    } catch (err) {
      console.error('Failed to delete tag:', err);
    }
  };

  const groups = groupTags(tags);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Tags</h1>
      </div>

      {loading ? (
        <div className={s.loading}>Loading tags...</div>
      ) : tags.length === 0 ? (
        <div className={s.empty}>No tags found</div>
      ) : (
        <>
          {groups.map((group) => (
            <div key={group.prefix} className={s.tagGroup}>
              <div className={s.tagGroupTitle}>{group.prefix}</div>
              <div className={s.tagGrid}>
                {group.tags.map((t) => (
                  <span
                    key={t.tag}
                    className={t.tag === selectedTag ? s.tagItemActive : s.tagItem}
                    onClick={() => selectTag(t.tag)}
                  >
                    {t.tag}
                    <span className={s.tagCount}>{t.claim_count}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}

          {selectedTag && (
            <>
              <hr className={s.divider} />

              <div className={s.detailSection}>
                <div className={s.detailTitle}>{selectedTag}</div>
                <div className={s.actions}>
                  {renaming ? (
                    <>
                      <input
                        className={s.searchInput}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename();
                          if (e.key === 'Escape') setRenaming(false);
                        }}
                        placeholder="New tag name..."
                      />
                      <button className={s.actionBtn} onClick={handleRename}>
                        Save
                      </button>
                      <button className={s.actionBtn} onClick={() => setRenaming(false)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={s.actionBtn}
                        onClick={() => {
                          setRenameValue(selectedTag);
                          setRenaming(true);
                        }}
                      >
                        Rename
                      </button>
                      <button className={s.dangerBtn} onClick={handleDelete}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className={s.detailSection}>
                <div className={s.detailLabel}>
                  Claims ({claims.length})
                </div>
                {claimsLoading ? (
                  <div className={s.loading}>Loading claims...</div>
                ) : claims.length === 0 ? (
                  <div className={s.empty}>No claims with this tag</div>
                ) : (
                  <div className={s.claimList}>
                    {claims.map((c) => (
                      <Link key={c.id} href={`/claims/${c.id}`} className={s.claimRow}>
                        <span className={s.claimScore}>
                          <ConfidenceBadge confidence={c.computed_confidence} score={c.score} />
                        </span>{' '}
                        <span className={s.claimStatement}>{c.statement}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
