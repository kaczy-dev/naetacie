'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export interface GSAPNumberCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatFn?: (val: number) => string;
}

export function GSAPNumberCounter({
  value,
  duration = 1.2,
  prefix = '',
  suffix = '',
  className = '',
  formatFn,
}: GSAPNumberCounterProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const objRef = useRef({ num: 0 });

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const targetNum = value;
    const obj = objRef.current;

    const tween = gsap.to(obj, {
      num: targetNum,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        const current = Math.round(obj.num);
        const formatted = formatFn ? formatFn(current) : current.toLocaleString('pl-PL');
        node.textContent = `${prefix}${formatted}${suffix}`;
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, duration, prefix, suffix, formatFn]);

  return <span ref={nodeRef} className={className}>{prefix}0{suffix}</span>;
}
