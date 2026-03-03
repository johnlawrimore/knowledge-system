import { IconInfoCircle } from '@tabler/icons-react';
import { strengthTierLabel } from '@/lib/enumLabels';
import s from './StrengthMeter.module.scss';

// Tier 1 = Definitive (strongest) → 5 filled bars
// Tier 5 = Speculative (weakest)  → 1 filled bar
const TIER_CLASSES: Record<number, string> = {
  1: s.tier1,
  2: s.tier2,
  3: s.tier3,
  4: s.tier4,
  5: s.tier5,
};

// Heights for the 5 signal bars (shortest to tallest)
const BAR_HEIGHTS = [5, 7, 9, 11, 13];

interface StrengthMeterProps {
  strength: number | null;
  notes?: string | null;
}

export default function StrengthMeter({ strength, notes }: StrengthMeterProps) {
  if (strength == null) return null;

  const filled = 6 - strength; // tier 1 → 5 filled, tier 5 → 1 filled
  const tierClass = TIER_CLASSES[strength] ?? s.tier3;

  return (
    <div className={s.inline}>
      <div className={s.bars}>
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={i}
            className={`${s.bar} ${i < filled ? `${s.filled} ${tierClass}` : s.dim}`}
            style={{ height: h }}
          />
        ))}
      </div>
      <span className={`${s.label} ${tierClass}`}>{strengthTierLabel(String(strength))}</span>
      {notes && (
        <span className={s.tooltipAnchor}>
          <IconInfoCircle size={13} stroke={1.75} className={s.infoIcon} />
          <span className={s.tooltip}>{notes}</span>
        </span>
      )}
    </div>
  );
}
