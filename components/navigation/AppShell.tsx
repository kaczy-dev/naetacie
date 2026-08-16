'use client';

/**
 * App Shell - Clean Top Navigation with Dropdown Menu & Mobile Bottom Nav.
 * Side menu removed per user request, replaced with a sleek Dropdown Menu.
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from 'framer-motion';
import {
  Map,
  List,
  Heart,
  Wifi,
  WifiOff,
  Moon,
  Sun,
  Monitor,
  Settings,
  Command,
  ChevronDown,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useOfflineSync } from '@/lib/hooks/useOfflineSync';
import { Logo, Wordmark } from '@/components/brand/Logo';
import { SystemHealthBadge } from '@/components/feedback/SystemHealthBadge';
import { TerminalTyper } from '@/components/brand/TerminalTyper';

export type TabId = 'list' | 'map' | 'favorites' | 'settings';

interface AppShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
  isLive?: boolean;
  onOpenSettings?: () => void;
  onOpenCommandPalette?: () => void;
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'list', label: 'Lista Ofert', icon: List },
  { id: 'map', label: 'Mapa 3D', icon: Map },
  { id: 'favorites', label: 'Ulubione', icon: Heart },
  { id: 'settings', label: 'Ustawienia', icon: Settings },
];

const TAB_ORDER: TabId[] = ['list', 'map', 'favorites', 'settings'];
const SWIPE_VELOCITY = 300;
const SWIPE_DISTANCE = 80;

export function AppShell({
  activeTab,
  onTabChange,
  children,
  isLive,
  onOpenSettings,
  onOpenCommandPalette,
}: AppShellProps) {
  const prefersReducedMotion = useReducedMotion();
  const { isOnline } = useOfflineSync();
  const { mode, setMode } = useTheme();
  const prevIndexRef = useRef(TAB_ORDER.indexOf(activeTab));
  const currentIndex = TAB_ORDER.indexOf(activeTab);
  const direction = currentIndex > prevIndexRef.current ? 1 : -1;
  prevIndexRef.current = currentIndex;

  const [dropdownMenuOpen, setDropdownMenuOpen] = useState(false);
  const [themeSubmenuOpen, setThemeSubmenuOpen] = useState(false);

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

  const themeIcons = { light: Sun, dark: Moon, oled: Moon, system: Monitor };

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-[100vw] overflow-x-hidden bg-background">
      {/* Top Header Navigation Bar */}
      <header className="sticky top-0 z-50 w-full glass-header h-14 px-3 sm:px-6 flex items-center justify-between transition-all">
        {/* Left: Brand logo & Live status */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer" onClick={() => onTabChange('list')}>
            <Logo size={34} animated={true} interactive3D={false} />
            <div className="absolute -inset-1 bg-primary/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <Wordmark className="text-base sm:text-lg font-black tracking-tight" />
          {isLive && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE 24/7
            </span>
          )}
        </div>

        {/* Center: Desktop Navigation Tabs with Kinetic LayoutId Spring */}
        <nav className="hidden md:flex items-center gap-1 bg-muted/50 dark:bg-muted/30 p-1 rounded-2xl border border-border/50 backdrop-blur-md shadow-inner">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer select-none',
                  isActive ? 'text-primary-foreground font-extrabold' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="header-active-tab-pill"
                    className="absolute inset-0 bg-primary rounded-xl shadow-md"
                    transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right: Rozwijane Menu (Dropdown Menu) & Command Palette Trigger */}
        <div className="flex items-center gap-2">
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs group"
              title="Otwórz paletę komend (⌘K)"
            >
              <Command className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
              <span className="hidden lg:inline">Paleta Komend</span>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono font-black bg-background/90 text-primary rounded-md border border-primary/30 shadow-2xs">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Prominent Rozwijane Menu (Dropdown Menu Button) */}
          <div className="relative">
            <button
              onClick={() => setDropdownMenuOpen(!dropdownMenuOpen)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer border border-primary-foreground/20"
              aria-label="Rozwijane menu nawigacji"
              aria-expanded={dropdownMenuOpen}
            >
              {dropdownMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span className="inline">Menu</span>
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', dropdownMenuOpen && 'rotate-180')} />
            </button>

            {/* Backdrop click dismiss */}
            {dropdownMenuOpen && (
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setDropdownMenuOpen(false)}
              />
            )}

            {/* Dropdown Menu Container */}
            <AnimatePresence>
              {dropdownMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-80 p-3 bg-popover/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl z-50 text-xs space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
                    <span className="font-black text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-primary animate-pulse" /> Menu Główny NaEtacie
                    </span>
                    <SystemHealthBadge />
                  </div>

                  {/* Navigation Tabs in Dropdown */}
                  <div className="space-y-1">
                    <span className="px-2 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      Główne Widoki
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              onTabChange(tab.id);
                              setDropdownMenuOpen(false);
                            }}
                            className={cn(
                              'flex items-center justify-between px-3 py-2 rounded-xl font-bold transition-all cursor-pointer',
                              isActive
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <Icon className="w-3.5 h-3.5" />
                              <span className="text-[11px]">{tab.label}</span>
                            </span>
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Theme Switcher Submenu */}
                  <div className="pt-2 border-t border-border/50 space-y-1.5">
                    <div className="flex items-center justify-between px-2 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      <span>Wybierz Motyw Interfejsu</span>
                      <span className="text-primary font-bold capitalize">{mode}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      {(['light', 'dark', 'oled', 'system'] as const).map((m) => {
                        const Icon = themeIcons[m];
                        const isThemeActive = mode === m;
                        const label = m === 'system' ? 'System' : m === 'oled' ? 'OLED Black' : m === 'dark' ? 'Ciemny' : 'Jasny';
                        return (
                          <button
                            key={m}
                            onClick={() => {
                              setMode(m);
                            }}
                            className={cn(
                              'flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer',
                              isThemeActive
                                ? 'bg-primary/15 text-primary border-primary/40 font-extrabold shadow-2xs'
                                : 'border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent/60'
                            )}
                          >
                            <Icon className="w-3.5 h-3.5 text-primary" />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Settings & Terminal Console */}
                  <div className="pt-2 border-t border-border/50 space-y-1.5">
                    {onOpenSettings && (
                      <button
                        onClick={() => {
                          onOpenSettings();
                          setDropdownMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent font-semibold transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-primary" />
                          <span>Ustawienia Aplikacji</span>
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-muted-foreground" />
                      </button>
                    )}

                    {/* Network status */}
                    <div className="px-3 py-1.5 rounded-xl bg-muted/40 flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                      <span className="flex items-center gap-2">
                        {isOnline ? (
                          <>
                            <Wifi className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                            <span>Połączono z serwerem</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-3.5 h-3.5 text-orange-500" />
                            <span>Tryb Offline</span>
                          </>
                        )}
                      </span>
                      <span className="text-[10px] text-emerald-500 font-extrabold">v2.4 Live</span>
                    </div>

                    <TerminalTyper className="mt-1 shadow-xs" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 min-w-0 pb-[72px] md:pb-0 relative overflow-hidden flex flex-col">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activeTab}
            custom={direction}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 30 }}
            className="w-full flex-1"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom navigation */}
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
                  'flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] px-3 py-2 rounded-xl transition-colors touch-manipulation cursor-pointer',
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
