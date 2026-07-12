'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Rotating motivational taglines for the sidebar/header.
 * Cycles every 5s with a smooth fade+slide, respecting reduced motion via CSS.
 */
const TAGLINES = [
  'Twoja następna praca jest bliżej niż myślisz. 🔨',
  'Solidna robota zasługuje na solidną ofertę. 🏗️',
  'Buduj karierę — dosłownie. 💪',
  'Każdy fach ma swoje miejsce. Znajdź swoje. 📍',
  'Realne oferty, realne wynagrodzenia, realny Szczecin. ⚡',
  'Od murarza po kierownika budowy — wszystko tutaj. 🎯',
];

export function MotivationalTagline({ className = '' }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % TAGLINES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ minHeight: '2.5rem' }}>
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="text-xs text-muted-foreground leading-relaxed"
        >
          {TAGLINES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
