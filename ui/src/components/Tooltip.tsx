'use client';

import { ReactNode, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconInfoCircle } from '@tabler/icons-react';
import s from './Tooltip.module.scss';

interface TooltipProps {
  text: string;
  children?: ReactNode;
}

export default function Tooltip({ text, children }: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const show = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
    setVisible(true);
  };

  return (
    <span
      ref={anchorRef}
      className={s.anchor}
      onMouseEnter={show}
      onMouseLeave={() => setVisible(false)}
    >
      {children || <IconInfoCircle size={13} stroke={1.75} className={s.icon} />}
      {visible &&
        createPortal(
          <span className={s.tooltip} style={{ top: pos.top, right: pos.right }}>
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
