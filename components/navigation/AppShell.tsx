'use client';

/**
 * Enterprise Polish App Shell - Top Navigation Header & Right-Side Quick Tools Hub.
 * Modern UI/UX with Framer Motion, Glassmorphism, Haptic Feedback & Keyboard Shortcuts.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Calculator,
  Bot,
  BarChart3,
  FileText,
  Building2,
  Volume2,
  VolumeX,
  Vibrate,
} from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useOfflineSync } from '@/lib/hooks/useOfflineSync';
import { Logo, Wordmark } from '@/components/brand/Logo';
import { SystemHealthBadge } from '@/components/feedback/SystemHealthBadge';
import { TerminalTyper } from '@/components/brand/TerminalTyper';
import { playUiSound, setUiSoundEnabled } from '@/lib/motion/soundEngine';
import { SPRING_PRESETS } from '@/lib/motion/springs';

export type TabId = 'list' | 'map' | 'favorites' | 'settings';

export interface AppShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
  isLive?: boolean;
  onOpenSettings?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenEstimator?: () => void;
  onOpenAiInterview?: () => void;
  onOpenSalaryBenchmark?: () => void;
  onOpenCvGenerator?: () => void;
  onOpenEmployerPortal?: () => void;
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
  onOpenEstimator,
  onOpenAiInterview,
  onOpenSalaryBenchmark,
  onOpenCvGenerator,
  onOpenEmployerPortal,
}: AppShellProps) {
  const prefersReducedMotion = useReducedMotion();
  const { isOnline } = useOfflineSync();
  const { mode, setMode } = useTheme();
  const prevIndexRef = useRef(TAB_ORDER.indexOf(activeTab));
  const currentIndex = TAB_ORDER.indexOf(activeTab);
  const direction = currentIndex > prevIndexRef.current ? 1 : -1;
  prevIndexRef.current = currentIndex;

  const [dropdownMenuOpen, setDropdownMenuOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // Close dropdown on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dropdownMenuOpen) {
        setDropdownMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dropdownMenuOpen]);

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
        enter: (dir: number) => ({ x: dir > 0 ? '12%' : '-12%', opacity: 0, scale: 0.98 }),
        center: { x: 0, opacity: 1, scale: 1 },
        exit: (dir: number) => ({ x: dir < 0 ? '12%' : '-12%', opacity: 0, scale: 0.98 }),
      };

  const themeIcons = { light: Sun, dark: Moon, oled: Moon, system: Monitor };

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-[100vw] overflow-x-hidden bg-background">
      {/* Top Header Navigation Bar */}
      <header className="sticky top-0 z-50 w-full h-14 px-3 sm:px-6 flex items-center justify-between border-b border-border/50 bg-background/85 backdrop-blur-xl transition-all shadow-xs">
        {/* Left: Brand logo & Live status */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              onTabChange('list');
            }}
            className="relative group cursor-pointer flex items-center gap-2 focus:outline-hidden"
            aria-label="Strona główna NaEtacie"
          >
            <Logo size={32} animated={true} interactive3D={false} />
            <Wordmark className="text-base sm:text-lg font-black tracking-tight" />
          </button>

          {isLive && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE 24/7
            </span>
          )}
        </div>

        {/* Center: Desktop Navigation Tabs with Kinetic LayoutId Spring */}
        <nav className="hidden md:flex items-center gap-1 bg-muted/60 dark:bg-muted/30 p-1 rounded-2xl border border-border/50 backdrop-blur-md shadow-inner">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playUiSound('pop');
                  triggerHaptic(10);
                  onTabChange(tab.id);
                }}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                  isActive ? 'text-primary-foreground font-extrabold shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="header-active-tab-pill"
                    className="absolute inset-0 bg-primary rounded-xl shadow-md"
                    transition={prefersReducedMotion ? { duration: 0 } : SPRING_PRESETS.snappy}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
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
              type="button"
              onClick={() => {
                playUiSound('pop');
                triggerHaptic(10);
                onOpenCommandPalette();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs group"
              title="Otwórz paletę komend (⌘K / Ctrl+K)"
            >
              <Command className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
              <span className="hidden lg:inline">Szukaj</span>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono font-black bg-background/90 text-primary rounded-md border border-primary/30 shadow-2xs">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Prominent Rozwijane Menu (Dropdown Menu Button) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                playUiSound('whoosh');
                triggerHaptic(12);
                setDropdownMenuOpen(!dropdownMenuOpen);
              }}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer border',
                dropdownMenuOpen
                  ? 'bg-primary text-primary-foreground border-primary shadow-primary/25 ring-2 ring-primary/20'
                  : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20'
              )}
              aria-label="Rozwijane menu nawigacji i narzędzi"
              aria-expanded={dropdownMenuOpen}
            >
              {dropdownMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span className="inline font-black">Menu</span>
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', dropdownMenuOpen && 'rotate-180')} />
            </button>

            {/* Backdrop click dismiss */}
            {dropdownMenuOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs"
                onClick={() => setDropdownMenuOpen(false)}
              />
            )}

            {/* Dropdown Menu Container */}
            <AnimatePresence>
              {dropdownMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-16 sm:top-full mt-0 sm:mt-2 w-auto sm:w-96 max-h-[82vh] overflow-y-auto p-4 bg-popover/98 backdrop-blur-2xl border border-border/80 rounded-3xl shadow-2xl z-50 text-xs space-y-3.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Top Profile / Status Banner */}
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 font-black text-foreground">
                        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                        <span>NaEtacie Pro</span>
                      </div>
                      <span className="text-[10.5px] text-muted-foreground font-medium">
                        Szczecin & Woj. Zachodniopomorskie
                      </span>
                    </div>
                    <SystemHealthBadge />
                  </div>

                  {/* Quick Polish Trade Tools Grid */}
                  <div className="space-y-1.5">
                    <span className="px-1 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      Narzędzia Fachowca & AI
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      {onOpenEstimator && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic(10);
                            onOpenEstimator();
                            setDropdownMenuOpen(false);
                          }}
                          className="p-2.5 rounded-xl border border-border/60 hover:border-primary/40 bg-muted/30 hover:bg-muted/80 text-left transition-all flex items-center gap-2 group cursor-pointer shadow-2xs"
                        >
                          <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                            <Calculator className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-foreground block text-[11px]">Wycena Robocizny</span>
                            <span className="text-[9.5px] text-muted-foreground">Kalkulator stawek</span>
                          </div>
                        </button>
                      )}

                      {onOpenAiInterview && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic(10);
                            onOpenAiInterview();
                            setDropdownMenuOpen(false);
                          }}
                          className="p-2.5 rounded-xl border border-border/60 hover:border-primary/40 bg-muted/30 hover:bg-muted/80 text-left transition-all flex items-center gap-2 group cursor-pointer shadow-2xs"
                        >
                          <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-foreground block text-[11px]">Trening AI</span>
                            <span className="text-[9.5px] text-muted-foreground">Symulator rozmowy</span>
                          </div>
                        </button>
                      )}

                      {onOpenSalaryBenchmark && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic(10);
                            onOpenSalaryBenchmark();
                            setDropdownMenuOpen(false);
                          }}
                          className="p-2.5 rounded-xl border border-border/60 hover:border-primary/40 bg-muted/30 hover:bg-muted/80 text-left transition-all flex items-center gap-2 group cursor-pointer shadow-2xs"
                        >
                          <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                            <BarChart3 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-foreground block text-[11px]">Stawki Szczecin</span>
                            <span className="text-[9.5px] text-muted-foreground">Benchmarki płac</span>
                          </div>
                        </button>
                      )}

                      {onOpenCvGenerator && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic(10);
                            onOpenCvGenerator();
                            setDropdownMenuOpen(false);
                          }}
                          className="p-2.5 rounded-xl border border-border/60 hover:border-primary/40 bg-muted/30 hover:bg-muted/80 text-left transition-all flex items-center gap-2 group cursor-pointer shadow-2xs"
                        >
                          <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-foreground block text-[11px]">Kreator CV</span>
                            <span className="text-[9.5px] text-muted-foreground">Gotowy plik PDF</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Navigation Views */}
                  <div className="space-y-1.5 pt-1 border-t border-border/50">
                    <span className="px-1 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      Widoki Główne
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              triggerHaptic(10);
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
                    <div className="flex items-center justify-between px-1 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      <span>Motyw Graficzny</span>
                      <span className="text-primary font-bold capitalize">{mode}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 pt-0.5">
                      {(['light', 'dark', 'oled', 'system'] as const).map((m) => {
                        const Icon = themeIcons[m];
                        const isThemeActive = mode === m;
                        const label = m === 'system' ? 'Auto' : m === 'oled' ? 'OLED' : m === 'dark' ? 'Ciemny' : 'Jasny';
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              triggerHaptic(10);
                              setMode(m);
                            }}
                            className={cn(
                              'flex flex-col items-center justify-center p-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer',
                              isThemeActive
                                ? 'bg-primary/15 text-primary border-primary/40 font-extrabold shadow-2xs'
                                : 'border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent/60'
                            )}
                          >
                            <Icon className="w-3.5 h-3.5 text-primary mb-0.5" />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Settings & System status */}
                  <div className="pt-2 border-t border-border/50 space-y-1.5">
                    {onOpenSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(10);
                          onOpenSettings();
                          setDropdownMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-foreground bg-muted/30 hover:bg-muted font-bold transition-colors cursor-pointer border border-border/50"
                      >
                        <span className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-primary" />
                          <span>Pełne Ustawienia Aplikacji</span>
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
                      <span className="text-[10px] text-emerald-500 font-extrabold">v2.5 Live</span>
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
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  onTabChange(tab.id);
                }}
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
                <span className={cn('text-[10px] font-medium', isActive && 'font-bold')}>
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
