import {
  IconChess,
  IconChessRook,
  IconChessKnight,
  IconChessKing,
} from '@tabler/icons-react';
import { tierLabel } from '@/lib/enumLabels';
import s from './TierBadge.module.scss';
import type { ComponentType } from 'react';

type TablerIcon = ComponentType<{ size?: number; stroke?: number; className?: string }>;

const tierConfig: Record<string, { cls: string; Icon: TablerIcon }> = {
  '1': { cls: s.tier1, Icon: IconChessKing },
  '2': { cls: s.tier2, Icon: IconChessRook },
  '3': { cls: s.tier3, Icon: IconChessKnight },
  '4': { cls: s.tier4, Icon: IconChess },
};

export default function TierBadge({
  tier,
}: {
  tier: number | null | undefined;
}) {
  if (tier == null) return null;
  const key = String(tier);
  const config = tierConfig[key] || tierConfig['4'];
  const { cls, Icon } = config;
  return (
    <span className={cls}>
      <Icon size={14} stroke={2} />
      {tierLabel(key).toUpperCase()}
    </span>
  );
}
