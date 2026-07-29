'use client';

import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface LogoProps {
  size?: number;
  animated?: boolean;
  interactive3D?: boolean;
  className?: string;
}

/**
 * 3D Animated "NaEtacie" Brand Logo.
 * Features:
 * - Interactive 3D Perspective Tilt on Mouse Movement
 * - Glassmorphic layers with dynamic light reflection (shimmer)
 * - Multi-layer floating elements (Hard hat, Pin badge, Glow aura)
 * - Micro-spring animations for tactile, premium mobile/desktop feel
 */
export function Logo({
  size = 40,
  animated = true,
  interactive3D = true,
  className = '',
}: LogoProps) {
  // Motion values for 3D interactive perspective tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [16, -16]), {
    stiffness: 300,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-16, 16]), {
    stiffness: 300,
    damping: 22,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive3D) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(xPct);
    mouseY.set(yPct);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center cursor-pointer select-none group ${className}`}
      style={{
        width: size,
        height: size,
        perspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={animated ? { scale: 1.08 } : undefined}
      whileTap={animated ? { scale: 0.94 } : undefined}
    >
      {/* 3D Container */}
      <motion.div
        className="relative w-full h-full flex items-center justify-center"
        style={{
          rotateX: interactive3D ? rotateX : 0,
          rotateY: interactive3D ? rotateY : 0,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Layer 0: Ambient Backlight Neon Glow */}
        {animated && (
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600/60 via-indigo-500/50 to-amber-500/40 blur-md opacity-70 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300"
            animate={{
              scale: [1, 1.06, 1],
              opacity: [0.6, 0.85, 0.6],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transform: 'translateZ(-12px)' }}
          />
        )}

        {/* Layer 1: Main 3D Metallic/Glass Badge */}
        <div
          className="relative w-full h-full rounded-[28%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 border border-white/30 shadow-xl overflow-hidden flex items-center justify-center"
          style={{ transform: 'translateZ(0px)' }}
        >
          {/* Internal Shimmer Surface Beam */}
          {animated && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full"
              animate={{
                translateX: ['-120%', '150%'],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                repeatDelay: 1.5,
                ease: 'easeInOut',
              }}
            />
          )}

          {/* Construction Blueprint Mesh Lines */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:6px_6px]" />

          {/* SVG 3D Helmet & Map Badge Graphics */}
          <motion.svg
            width={size * 0.72}
            height={size * 0.72}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ transform: 'translateZ(14px)' }}
            className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
          >
            {/* Map Pin Backdrop */}
            <path
              d="M20 4C14.477 4 10 8.477 10 14c0 7.5 10 21 10 21s10-13.5 10-21c0-5.523-4.477-10-10-10z"
              fill="white"
              fillOpacity="0.15"
            />

            {/* Hard Hat Dome */}
            <path
              d="M12 24C12 18.477 15.582 14 20 14C24.418 14 28 18.477 28 24H12Z"
              fill="url(#helmetGrad)"
            />

            {/* Hard Hat Rim */}
            <rect x="9.5" y="24" width="21" height="3" rx="1.5" fill="#FFFFFF" />

            {/* Hard Hat Front Crest */}
            <rect x="18.5" y="11" width="3" height="5" rx="1.5" fill="#FBFBFB" />

            {/* Accent Stars / Sparkles */}
            <circle cx="28" cy="10" r="1.5" fill="#F59E0B" />
            <circle cx="11" cy="11" r="1.2" fill="#60A5FA" />

            <defs>
              <linearGradient id="helmetGrad" x1="12" y1="14" x2="28" y2="24" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFFFFF" />
                <stop offset="1" stopColor="#E2E8F0" />
              </linearGradient>
            </defs>
          </motion.svg>
        </div>

        {/* Layer 2: Floating Active Job Pulse Badge */}
        {animated && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-background shadow-md flex items-center justify-center z-10"
            style={{ transform: 'translateZ(22px)' }}
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="w-1 h-1 rounded-full bg-amber-900 animate-ping" />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

/**
 * Enhanced Wordmark: "Na" in text-foreground, "Etacie" with a vibrant gradient glow
 * and micro 3D text shadow depth.
 */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`inline-flex items-center font-extrabold tracking-tight select-none ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <span className="text-foreground drop-shadow-sm">Na</span>
      <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
        Etacie
      </span>
    </motion.div>
  );
}
