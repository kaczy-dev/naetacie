'use client';

import { useState, useEffect } from 'react';

export type ScrollDirection = 'up' | 'down' | 'top';

export interface UseScrollDirectionOptions {
  threshold?: number;
  initialDirection?: ScrollDirection;
}

/**
 * useScrollDirection - High-performance scroll direction tracker for mobile auto-hiding UI.
 */
export function useScrollDirection(options?: UseScrollDirectionOptions): ScrollDirection {
  const threshold = options?.threshold ?? 15;
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(options?.initialDirection ?? 'top');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDir = () => {
      const scrollY = window.scrollY;

      if (scrollY <= 20) {
        setScrollDirection('top');
        lastScrollY = scrollY > 0 ? scrollY : 0;
        ticking = false;
        return;
      }

      if (Math.abs(scrollY - lastScrollY) < threshold) {
        ticking = false;
        return;
      }

      setScrollDirection(scrollY > lastScrollY ? 'down' : 'up');
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDir);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrollDirection;
}
