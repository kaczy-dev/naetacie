'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CategoryKey } from '@/lib/data/categories';

export interface PriceTagMarkerProps {
  id: string;
  title: string;
  price: string | number | null;
  category: string;
  sourcePortal: string;
  isBoosted?: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Maps categories to high-contrast enterprise neon colors.
 */
export function getCategoryTheme(category?: string | null): {
  bg: string;
  border: string;
  text: string;
  glow: string;
  icon: string;
} {
  const cat = (category || '').toLowerCase();

  if (cat.includes('elektryk') || cat.includes('elektr')) {
    return {
      bg: 'bg-amber-950/90',
      border: 'border-amber-500',
      text: 'text-amber-300',
      glow: 'shadow-amber-500/40',
      icon: '⚡',
    };
  }

  if (cat.includes('hydraulik') || cat.includes('wod-kan') || cat.includes('co')) {
    return {
      bg: 'bg-cyan-950/90',
      border: 'border-cyan-500',
      text: 'text-cyan-300',
      glow: 'shadow-cyan-500/40',
      icon: '🚿',
    };
  }

  if (cat.includes('wykończ') || cat.includes('glazurnik') || cat.includes('malarz')) {
    return {
      bg: 'bg-purple-950/90',
      border: 'border-purple-500',
      text: 'text-purple-300',
      glow: 'shadow-purple-500/40',
      icon: '🎨',
    };
  }

  if (cat.includes('instalac')) {
    return {
      bg: 'bg-emerald-950/90',
      border: 'border-emerald-500',
      text: 'text-emerald-300',
      glow: 'shadow-emerald-500/40',
      icon: '🔧',
    };
  }

  // Default General Construction
  return {
    bg: 'bg-orange-950/90',
    border: 'border-orange-500',
    text: 'text-orange-300',
    glow: 'shadow-orange-500/40',
    icon: '🧱',
  };
}

/**
 * Formats full salary strings/numbers into ultra-compact desktop price badges (e.g. 8.5k, 12k, 45/h).
 */
export function formatCompactPrice(price: string | number | null): string {
  if (price === null || price === undefined || price === '') {
    return 'Wycena';
  }

  if (typeof price === 'number') {
    if (price >= 1000) {
      const kVal = price / 1000;
      return `${kVal % 1 === 0 ? kVal : kVal.toFixed(1)}k zł`;
    }
    return `${price} zł`;
  }

  const str = String(price).trim();
  const numMatch = str.match(/(\d+(?:[\s.,]\d+)?)/);
  if (numMatch) {
    const rawNum = parseFloat(numMatch[1].replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(rawNum)) {
      if (rawNum >= 1000) {
        const kVal = rawNum / 1000;
        return `${kVal % 1 === 0 ? kVal : kVal.toFixed(1)}k`;
      }
      if (str.toLowerCase().includes('/h') || str.toLowerCase().includes('zł/h') || str.toLowerCase().includes('godz')) {
        return `${rawNum}/h`;
      }
      return `${rawNum} zł`;
    }
  }

  return 'Wycena';
}

export const PriceTagMarker: React.FC<PriceTagMarkerProps> = ({
  title,
  price,
  category,
  isBoosted = false,
  isSelected = false,
  isHovered = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const theme = getCategoryTheme(category);
  const formattedPrice = formatCompactPrice(price);

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="relative cursor-pointer select-none group"
    >
      {/* 3D Sonar Beacon Halo when Hovered or Selected */}
      {(isSelected || isHovered) && (
        <span className="absolute -inset-2 rounded-full bg-amber-400/30 animate-ping pointer-events-none" />
      )}

      {/* 3D Golden Light Pillar for Promoted/Boosted Ads */}
      {isBoosted && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-1 h-12 bg-gradient-to-t from-amber-400 to-transparent pointer-events-none opacity-80 animate-pulse" />
      )}

      {/* Main Glass Tag Pill */}
      <motion.div
        whileHover={{ scale: 1.15, y: -2 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 text-xs font-black tracking-tight backdrop-blur-md shadow-lg transition-colors ${
          theme.bg
        } ${isSelected ? 'border-yellow-300 ring-4 ring-yellow-400/40 scale-110 z-30' : theme.border} ${
          theme.text
        } ${theme.glow}`}
      >
        <span className="text-[11px]">{theme.icon}</span>
        <span>{formattedPrice}</span>

        {isBoosted && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
      </motion.div>

      {/* Pin pointer triangle */}
      <div
        className={`w-0 h-0 mx-auto border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] ${
          isSelected ? 'border-t-yellow-300' : 'border-t-zinc-800'
        }`}
      />
    </div>
  );
};
