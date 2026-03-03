import {
  IconLayoutDashboard,
  IconFileStack,
  IconUsers,
  IconBulb,

  IconListTree,
  IconTimeline,
  IconTags,
  IconWriting,
  IconFilter,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

type TablerIcon = ComponentType<{ size?: number; stroke?: number; className?: string }>;

const PAGE_ICONS: Record<string, TablerIcon> = {
  dashboard: IconLayoutDashboard,
  sources: IconFileStack,
  contributors: IconUsers,
  claims: IconBulb,

  topics: IconListTree,
  themes: IconTimeline,
  tags: IconTags,
  compositions: IconWriting,
  filters: IconFilter,
};

export function pageIcon(page: string): TablerIcon {
  return PAGE_ICONS[page] || IconLayoutDashboard;
}

export { PAGE_ICONS };
