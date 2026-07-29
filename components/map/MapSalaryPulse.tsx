'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface MapSalaryPulseProps {
  price?: number | null;
  threshold?: number;
}

export function MapSalaryPulse({ price, threshold = 40 }: MapSalaryPulseProps) {
  if (!price || price < threshold) return null;

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Emerald Radar Wave 1 */}
      <motion.span
        animate={{ scale: [1, 1.8, 2.2], opacity: [0.7, 0.3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        className="absolute inset-0 rounded-full bg-emerald-500/40 pointer-events-none"
      />
      {/* Emerald Radar Wave 2 */}
      <motion.span
        animate={{ scale: [1, 1.5, 1.9], opacity: [0.6, 0.2, 0] }}
        transition={{ duration: 2, delay: 0.6, repeat: Infinity, ease: 'easeOut' }}
        className="absolute inset-0 rounded-full bg-emerald-400/40 pointer-events-none"
      />
    </div>
  );
}
