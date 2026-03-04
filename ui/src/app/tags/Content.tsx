'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// @ts-expect-error -- react-tagcloud has no type declarations
import { TagCloud as ReactTagCloud } from 'react-tagcloud';
import { TagItem, TagGroup, ClaimRow } from '@/lib/types';
import { pageIcon } from '@/lib/pageIcons';
import TagCloud from './TagCloud';
import TagDetail from './TagDetail';
import s from '../shared.module.scss';

const TagsIcon = pageIcon('tags');

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

  const selectedTag = searchParams.get('tag');

  const selectTag = useCallback(
    (tag: string) => {
      const params = new URLSearchParams();
      params.set('tag', tag);
      router.push(`/tags?${params.toString()}`);
    },
    [router]
  );

  const closeModal = useCallback(() => {
    router.push('/tags');
  }, [router]);

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

  const refreshTags = async () => {
    const tagsRes = await fetch('/api/tags');
    const tagsData = await tagsRes.json();
    setTags(tagsData.tags || []);
  };

  const handleRename = async (oldTag: string, newTag: string) => {
    try {
      const res = await fetch(`/api/tags/${encodeURIComponent(oldTag)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newTag }),
      });
      if (res.ok) {
        await refreshTags();
        router.push(`/tags?tag=${encodeURIComponent(newTag)}`);
      }
    } catch (err) {
      console.error('Failed to rename tag:', err);
    }
  };

  const handleDelete = async (tag: string) => {
    try {
      const res = await fetch(`/api/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await refreshTags();
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
        <h1 className={s.title}><TagsIcon size={32} stroke={2} className={s.pageIcon} />Tags</h1>
      </div>

      {loading ? (
        <div className={s.loading}>Loading tags...</div>
      ) : tags.length === 0 ? (
        <div className={s.empty}>No tags found</div>
      ) : (
        <>
          <div className={s.tagCloud}>
            <ReactTagCloud
              minSize={14}
              maxSize={40}
              tags={tags.map((t) => ({ value: t.tag, count: t.claim_count, key: t.tag }))}
              colorOptions={{ luminosity: 'light', hue: 'blue' }}
              shuffle={false}
              onClick={(tag: { value: string }) => selectTag(tag.value)}
            />
          </div>

          <TagCloud groups={groups} selectedTag={selectedTag} onSelect={selectTag} />

          {selectedTag && (
            <TagDetail
              tag={selectedTag}
              claims={claims}
              claimsLoading={claimsLoading}
              onRename={handleRename}
              onDelete={handleDelete}
              onClose={closeModal}
            />
          )}
        </>
      )}
    </div>
  );
}
