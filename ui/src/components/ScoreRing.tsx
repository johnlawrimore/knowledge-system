import s from './ScoreRing.module.scss';

const SCORE_COLORS: Record<number, string> = {
  5: 'var(--accent-green)',
  4: 'var(--accent-green)',
  3: 'var(--text-muted)',
  2: 'var(--accent-orange)',
  1: 'var(--accent-red)',
};

interface ScoreRingProps {
  value: number | null;
  size?: number;
}

export default function ScoreRing({ value, size = 48 }: ScoreRingProps) {
  const strokeWidth = 3;
  const r = (size - strokeWidth * 2) / 2;
  const c = 2 * Math.PI * r;

  if (value == null) {
    return (
      <div className={s.ring} style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className={s.svg}>
          <circle cx={size / 2} cy={size / 2} r={r} className={s.track} strokeWidth={strokeWidth} />
        </svg>
        <span className={s.empty}>–</span>
      </div>
    );
  }

  const offset = c * (1 - Math.min(value / 5, 1));
  const color = SCORE_COLORS[value] || SCORE_COLORS[3];

  return (
    <div className={s.ring} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className={s.svg}>
        <circle cx={size / 2} cy={size / 2} r={r} className={s.track} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          className={s.progress}
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ stroke: color }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className={s.value} style={{ color }}>{value}</span>
    </div>
  );
}
