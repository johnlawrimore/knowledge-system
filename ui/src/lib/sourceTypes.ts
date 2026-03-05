import {
  IconMicrophone,
  IconPresentation,
  IconUsers,
  IconArticle,
  IconFlask,
  IconSchool,
  IconNews,
  IconFileAnalytics,
  IconFileDescription,
  IconFile,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

interface TypeConfig {
  label: string;
  icon: ComponentType<{ size?: number; stroke?: number; className?: string }>;
}

// Source type: content classification (what kind of intellectual work it is)
const SOURCE_TYPE_MAP: Record<string, TypeConfig> = {
  interview: { label: 'Interview', icon: IconMicrophone },
  lecture: { label: 'Lecture', icon: IconPresentation },
  panel: { label: 'Panel', icon: IconUsers },
  essay: { label: 'Essay', icon: IconArticle },
  research: { label: 'Research', icon: IconFlask },
  tutorial: { label: 'Tutorial', icon: IconSchool },
  news: { label: 'News', icon: IconNews },
  review: { label: 'Review', icon: IconFileAnalytics },
  documentation: { label: 'Documentation', icon: IconFileDescription },
  report: { label: 'Report', icon: IconFileAnalytics },
  other: { label: 'Other', icon: IconFile },
};

// Format: delivery medium (how the content was originally delivered)
const FORMAT_MAP: Record<string, TypeConfig> = {
  transcript: { label: 'Transcript', icon: IconMicrophone },
  text: { label: 'Text', icon: IconArticle },
};

const FALLBACK: TypeConfig = { label: '', icon: IconFile };

export function sourceTypeLabel(type: string): string {
  return SOURCE_TYPE_MAP[type]?.label || type;
}

export function sourceTypeIcon(type: string): ComponentType<{ size?: number; stroke?: number; className?: string }> {
  return SOURCE_TYPE_MAP[type]?.icon || FALLBACK.icon;
}

export function formatLabel(format: string): string {
  return FORMAT_MAP[format]?.label || format;
}

export function formatIcon(format: string): ComponentType<{ size?: number; stroke?: number; className?: string }> {
  return FORMAT_MAP[format]?.icon || FALLBACK.icon;
}

export const SOURCE_TYPES = Object.entries(SOURCE_TYPE_MAP).map(([value, { label }]) => ({
  value,
  label,
}));

export const FORMATS = Object.entries(FORMAT_MAP).map(([value, { label }]) => ({
  value,
  label,
}));
