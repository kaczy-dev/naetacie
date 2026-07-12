'use client';

import { motion } from 'framer-motion';

/**
 * NaEtacie brand logo — a hard-hat mark inside a rounded badge with an
 * animated "pin drop" accent, reflecting construction jobs on a map.
 */
export function Logo({ size = 32, animated = true }: { size?: number; animated?: boolean }) {
  const badge = (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="naEtacieGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#naEtacieGrad)" />
      {/* Hard hat */}
      <path
        d="M11 25c0-5 4-9 9-9s9 4 9 9H11z"
        fill="white"
      />
      <rect x="9" y="25" width="22" height="3" rx="1.5" fill="white" />
      <rect x="18.5" y="12" width="3" height="5" rx="1.5" fill="white" />
    </svg>
  );

  if (!animated) return badge;

  return (
    <motion.div
      initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      whileHover={{ rotate: [0, -6, 6, 0], transition: { duration: 0.5 } }}
      style={{ display: 'inline-flex' }}
    >
      {badge}
    </motion.div>
  );
}

/** Wordmark: "Na" in muted, "Etacie" in primary — the brand name. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className="text-foreground">Na</span>
      <span className="text-primary">Etacie</span>
    </span>
  );
}
