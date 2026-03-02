import {
  IconBrandYoutube,
  IconArticle,
  IconSchool,
  IconBook,
  IconBookmark,
  IconPresentation,
  IconMicrophone,
  IconFileAnalytics,
  IconFileDescription,
  IconMail,
  IconFlask,
  IconWorld,
  IconFile,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

interface SourceTypeConfig {
  label: string;
  icon: ComponentType<{ size?: number; stroke?: number; className?: string }>;
}

const SOURCE_TYPE_MAP: Record<string, SourceTypeConfig> = {
  youtube_video: { label: 'YouTube Video', icon: IconBrandYoutube },
  blog_post: { label: 'Blog Post', icon: IconArticle },
  academic_paper: { label: 'Academic Paper', icon: IconSchool },
  book: { label: 'Book', icon: IconBook },
  book_chapter: { label: 'Book Chapter', icon: IconBookmark },
  conference_talk: { label: 'Conference Talk', icon: IconPresentation },
  podcast: { label: 'Podcast', icon: IconMicrophone },
  report: { label: 'Report', icon: IconFileAnalytics },
  documentation: { label: 'Documentation', icon: IconFileDescription },
  newsletter: { label: 'Newsletter', icon: IconMail },
  research: { label: 'Research', icon: IconFlask },
  website: { label: 'Website', icon: IconWorld },
};

const FALLBACK: SourceTypeConfig = { label: '', icon: IconFile };

export function sourceTypeLabel(type: string): string {
  return SOURCE_TYPE_MAP[type]?.label || type;
}

export function sourceTypeIcon(type: string): ComponentType<{ size?: number; stroke?: number; className?: string }> {
  return SOURCE_TYPE_MAP[type]?.icon || FALLBACK.icon;
}

export const SOURCE_TYPES = Object.entries(SOURCE_TYPE_MAP).map(([value, { label }]) => ({
  value,
  label,
}));
