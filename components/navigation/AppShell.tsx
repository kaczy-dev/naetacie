'use client';

/**
 * App Shell - Main navigation layout with beautiful animations.
 * - Mobile: Bottom navigation with swipe gestures
 * - Desktop: Side navigation with hover effects
 * - Glassmorphism design, animated transitions
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from 'framer-motion';
import { Map, List, Bell, User, Wifi, WifiOff, Moon, Sun, Monitor, Settings, Command, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useOfflineSync } from '@/lib/hooks/useOfflineSync';
import { Logo, Wordmark } from '@/components/brand/Logo';
import { MotivationalTagline } from '@/components/brand/MotivationalTagline';
import { SystemHealthBadge } from '@/components/feedback/SystemHealthBadge';
import { TerminalTyper } from '@/components/brand/TerminalTyper';

export type TabId = 'map' | 'list' | 'notifications' | 'profile';

interface AppShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
  isLive?: boolean;
  onOpenSettings?: () => void;
  onOpenCommandPalette?: () => void;
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'map', label: 'Mapa', icon: Map },
  { id: 'list', label: 'Lista', icon: List },
  { id: 'notifications', label: 'Powiadomienia', icon: Bell },
  { id: 'profile', label: 'Profil', icon: User },
];

const TAB_ORDER: TabId[] = ['map', 'list', 'notifications', 'profile'];
const SWIPE_VELOCITY = 300;
const SWIPE_DISTANCE = 80;

export function AppShell({ activeTab, onTabChange, children, isLive, onOpenSettings, onOpenCommandPalette }: AppShellProps) {
  const prefersReducedMotion = useReducedMotion();
  const { isOnline } = useOfflineSync();
  const { mode, setMode } = useTheme();
  const prevIndexRef = useRef(TAB_ORDER.indexOf(activeTab));
  const currentIndex = TAB_ORDER.indexOf(activeTab);
  const direction = currentIndex > prevIndexRef.current ? 1 : -1;
  prevIndexRef.current = currentIndex;

  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const handleSwipe = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;
      let swipeDir: 'left' | 'right' | null = null;

      if (Math.abs(velocity.x) > SWIPE_VELOCITY) {
        swipeDir = velocity.x > 0 ? 'right' : 'left';
      } else if (Math.abs(offset.x) > SWIPE_DISTANCE) {
        swipeDir = offset.x > 0 ? 'right' : 'left';
      }

      if (!swipeDir) return;
      const idx = TAB_ORDER.indexOf(activeTab);
      if (swipeDir === 'left' && idx < TAB_ORDER.length - 1) onTabChange(TAB_ORDER[idx + 1]);
      if (swipeDir === 'right' && idx > 0) onTabChange(TAB_ORDER[idx - 1]);
    },
    [activeTab, onTabChange]
  );

  const contentVariants = prefersReducedMotion
    ? { enter: {}, center: {}, exit: {} }
    : {
        enter: (dir: number) => ({ x: dir > 0 ? '15%' : '-15%', opacity: 0, scale: 0.97 }),
        center: { x: 0, opacity: 1, scale: 1 },
        exit: (dir: number) => ({ x: dir < 0 ? '15%' : '-15%', opacity: 0, scale: 0.97 }),
      };

  const themeIcons = { light: Sun, dark: Moon, system: Monitor };

  return (
    <div className="flex min-h-[100dvh] max-w-[100vw] overflow-x-hidden bg-background">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col w-64 min-w-[256px] h-[100dvh] sticky top-0 border-r border-border/50 bg-card/85 backdrop-blur-xl shadow-lg z-50">
        {/* Logo + brand */}
        <div className="p-6 border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <Logo size={42} animated={true} interactive3D={true} />
            <Wordmark className="text-xl" />
          </div>
          <MotivationalTagline className="mt-3" />
        </div>

        {/* Nav items + Command Palette + macOS Terminal Console */}
        <div className="flex-1 py-4 px-3 space-y-3 overflow-y-auto">
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 transition-all font-bold text-xs shadow-sm group cursor-pointer"
              title="Otwórz paletę komend (⌘K)"
            >
              <span className="flex items-center gap-2">
                <Command className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />
                <span>Paleta Komend</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-background/90 text-primary rounded border border-primary/30 shadow-xs">
                ⌘K
              </kbd>
            </button>
          )}

          {/* macOS Terminal Console directly under Command Palette */}
          <TerminalTyper className="shadow-md" />

          <div className="space-y-1.5 pt-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 touch-manipulation',
                    isActive
                      ? 'bg-gradient-to-r from-primary/20 via-primary/15 to-primary/5 text-primary shadow-sm border border-primary/20'
                      : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground'
                  )}
                  whileHover={prefersReducedMotion ? undefined : { x: 5, scale: 1.01 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                >
                  <Icon className={cn('w-5 h-5 transition-transform duration-200', isActive ? 'text-primary scale-110' : 'text-muted-foreground')} />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="ml-auto w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(37,99,235,0.8)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Status & Theme */}
        <div className="p-4 border-t border-border/50 space-y-3 bg-card/40">
          {/* Online status */}
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isLive ? 'Na żywo (Sync 24/7)' : 'Online'}</span>
                {isLive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />}
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-orange-500" />
                <span>Tryb Offline</span>
              </>
            )}
          </div>

          <div className="mb-2">
            <SystemHealthBadge />
          </div>

          {/* Theme switcher */}
          <div className="relative">
            <button
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full px-2.5 py-2 rounded-lg hover:bg-accent border border-transparent hover:border-border"
            >
              {React.createElement(themeIcons[mode], { className: 'w-3.5 h-3.5 text-primary' })}
              <span>Motyw: {mode === 'system' ? 'Systemowy' : mode === 'dark' ? 'Ciemny 🌙' : 'Jasny ☀️'}</span>
            </button>
            {themeMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-full left-0 mb-1 w-full bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-xl p-1.5 z-50"
              >
                {(['light', 'dark', 'system'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setThemeMenuOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors',
                      mode === m ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {React.createElement(themeIcons[m], { className: 'w-3.5 h-3.5' })}
                    {m === 'system' ? 'Systemowy' : m === 'dark' ? 'Ciemny (Dark Mode)' : 'Jasny (Light Mode)'}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Settings button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-full px-2.5 py-2 rounded-lg hover:bg-accent border border-transparent hover:border-border"
            >
              <Settings className="w-3.5 h-3.5 text-primary" />
              <span>Ustawienia Aplikacji</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile top brand bar (sidebar is hidden on mobile) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card/85 backdrop-blur-lg border-b border-border/50 flex items-center justify-between px-4 h-13 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Logo size={32} animated={true} interactive3D={false} />
          <Wordmark className="text-base" />
        </div>
        <div className="flex items-center gap-2">
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Otwórz paletę komend (⌘K)"
            >
              <Command className="w-3.5 h-3.5" />
              <span>⌘K</span>
            </button>
          )}
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </span>
          )}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Ustawienia"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-12 md:pt-0 pb-[72px] md:pb-0 relative overflow-hidden flex flex-col">
        {/* Mobile Terminal Stream Banner directly under mobile top bar */}
        <div className="md:hidden px-3 pt-2.5 pb-0.5">
          <TerminalTyper className="shadow-md" />
        </div>

        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activeTab}
            custom={direction}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 30 }}
            drag={prefersReducedMotion ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleSwipe}
            className="w-full min-h-[100dvh] md:min-h-0"
            style={{ touchAction: 'pan-y' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <motion.nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 safe-bottom"
        initial={prefersReducedMotion ? false : { y: 80 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="flex items-center justify-around h-[72px] px-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] px-3 py-2 rounded-xl transition-colors touch-manipulation',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
              >
                <motion.div
                  animate={prefersReducedMotion ? {} : { scale: isActive ? 1.1 : 1, y: isActive ? -2 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </motion.div>
                <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-indicator"
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Offline indicator */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-orange-500/10 border-t border-orange-500/20 text-center py-1"
            >
              <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                Tryb offline — dane z pamięci podręcznej
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}
