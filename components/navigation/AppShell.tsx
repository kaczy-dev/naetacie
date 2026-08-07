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
      {/* Top Header Navigation Bar (Replaces side menu, includes Dropdown Menu) */}
      <header className="sticky top-0 z-50 w-full bg-card/85 backdrop-blur-xl border-b border-border/50 shadow-sm h-14 px-4 flex items-center justify-between">
        {/* Left: Brand logo */}
        <div className="flex items-center gap-3">
          <Logo size={32} animated={true} interactive3D={false} />
          <Wordmark className="text-base md:text-lg" />
          {isLive && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE 24/7
            </span>
          )}
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/40">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Rozwijane Menu (Dropdown Menu) & Command Palette Trigger */}
        <div className="flex items-center gap-2">
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Otwórz paletę komend (⌘K)"
            >
              <Command className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paleta Komend</span>
              <kbd className="px-1 py-0.2 text-[9px] font-mono font-extrabold bg-background/90 text-primary rounded border border-primary/30">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Prominent Rozwijane Menu (Dropdown Menu Button) */}
          <div className="relative">
            <button
              onClick={() => setDropdownMenuOpen(!dropdownMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              aria-label="Rozwijane menu"
            >
              {dropdownMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span className="inline">Menu</span>
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', dropdownMenuOpen && 'rotate-180')} />
            </button>

            {/* Dropdown Menu Container */}
            <AnimatePresence>
              {dropdownMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-72 p-2 bg-popover/95 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl z-50 text-xs space-y-2 animate-in fade-in zoom-in-95"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
                    <span className="font-extrabold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Rozwijane Menu Nawigacji
                    </span>
                    <SystemHealthBadge />
                  </div>

                  {/* Navigation Tabs in Dropdown */}
                  <div className="space-y-1">
                    <span className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Widoki Aplikacji
                    </span>
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
                            'w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer',
                            isActive ? 'bg-primary/15 text-primary font-bold border border-primary/20' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                          </span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Theme Switcher Submenu */}
                  <div className="pt-2 border-t border-border/50 space-y-1">
                    <button
                      onClick={() => setThemeSubmenuOpen(!themeSubmenuOpen)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent font-medium cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        {React.createElement(themeIcons[mode], { className: 'w-4 h-4 text-primary' })}
                        <span>Motyw: {mode === 'system' ? 'Systemowy' : mode === 'oled' ? 'OLED Black' : mode === 'dark' ? 'Ciemny' : 'Jasny'}</span>
                      </span>
                      <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', themeSubmenuOpen && 'rotate-180')} />
                    </button>

                    {themeSubmenuOpen && (
                      <div className="pl-4 space-y-1 pt-1">
                        {(['light', 'dark', 'oled', 'system'] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => {
                              setMode(m);
                              setThemeSubmenuOpen(false);
                            }}
                            className={cn(
                              'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer',
                              mode === m && 'text-primary font-bold bg-primary/10'
                            )}
                          >
                            {React.createElement(themeIcons[m], { className: 'w-3.5 h-3.5' })}
                            <span>{m === 'system' ? 'Systemowy' : m === 'oled' ? 'OLED Pure Black' : m === 'dark' ? 'Ciemny (Dark Mode)' : 'Jasny (Light Mode)'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Settings & Terminal Console */}
                  <div className="pt-2 border-t border-border/50 space-y-1">
                    {onOpenSettings && (
                      <button
                        onClick={() => {
                          onOpenSettings();
                          setDropdownMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent font-semibold cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-primary" />
                        <span>Ustawienia Aplikacji</span>
                      </button>
                    )}

                    {/* Network status */}
                    <div className="px-3 py-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      {isOnline ? (
                        <>
                          <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Połączono z serwerem</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3.5 h-3.5 text-orange-500" />
                          <span>Tryb Offline</span>
                        </>
                      )}
                    </div>

                    <TerminalTyper className="mt-1 shadow-sm" />
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
