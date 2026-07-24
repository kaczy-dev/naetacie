'use client';

/**
 * Main app page — map and list are integrated into a single feature:
 * - Same search/sort/portal/favorites/category filters drive both views.
 * - Clicking a marker highlights the matching list card (and can jump to it).
 * - Clicking "Pokaż na mapie" on a card switches to the map tab and flies
 *   to that marker, opening its popup.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  MapPin, Clock, Sparkles, X, ArrowRight, RefreshCw, Loader2,
  Search, Heart, ExternalLink, SlidersHorizontal, Map as MapIcon,
  Target, Briefcase, Share2, Check, Mic, WifiOff, Download,
} from 'lucide-react';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRealtimeAnnouncements } from '@/lib/hooks/useRealtimeAnnouncements';
import { useOfflineSync } from '@/lib/hooks/useOfflineSync';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';
import { useScraper } from '@/lib/hooks/useScraper';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { useJobPreferences } from '@/lib/hooks/useJobPreferences';
import { useApplicationTracking, STATUS_META, type ApplicationStatus } from '@/lib/hooks/useApplicationTracking';
import { scoreMatch, hasNoPreferences } from '@/lib/matching/engine';
import { useShare } from '@/lib/hooks/useShare';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppShell, type TabId } from '@/components/navigation/AppShell';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { JobPreferencesPanel } from '@/components/list/JobPreferencesPanel';
import { QuickSearchChips } from '@/components/list/QuickSearchChips';
import { MarketStats } from '@/components/list/MarketStats';
import { computeMarketOverview } from '@/lib/stats/market';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn, triggerHaptic, exportApplicationsToCSV, ensureAbsoluteUrl } from '@/lib/utils';
import { ALL_CATEGORY_KEYS, normalizeCategory, type CategoryKey } from '@/lib/data/categories';
import { searchAnnouncements, tokenize, isSzczecinAnnouncement } from '@/lib/search/engine';
import type { DisplayAnnouncement } from '@/lib/types/display';
import type { MatchResult } from '@/lib/matching/types';

import MapViewDynamic from '@/components/map/MapViewDynamic';
import { ProfileSettings } from '@/components/profile';
import { Hero } from '@/components/landing/Hero';
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt';
import PullToRefresh from '@/components/feedback/PullToRefresh';
import { RecentSearchChips } from '@/components/list/RecentSearchChips';
import { SalaryNetModal } from '@/components/salary/SalaryNetModal';
import { JobComparisonModal } from '@/components/compare/JobComparisonModal';
import { KinematicQuickView } from '@/components/list/KinematicQuickView';
import { MarketPulseBar } from '@/components/list/MarketPulseBar';
import { CommandPaletteModal } from '@/components/navigation/CommandPaletteModal';
import { NotificationsView } from '@/components/notifications/NotificationsView';
import { playUiChime } from '@/lib/audio/chime';

type SortOption = 'match' | 'newest' | 'oldest' | 'price-asc' | 'price-desc';

// --- Guest Banner ---

function GuestBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20 px-4 py-3"
    >
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">Przeglądasz NaEtacie jako gość.</span>
          <a href="/login" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            Zaloguj się <ArrowRight className="w-3 h-3" />
          </a>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent" aria-label="Zamknij">
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// --- Announcement Card ---

// --- Search Query Highlight Helper ---
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/60 text-foreground px-0.5 rounded font-semibold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

function MatchBadge({ score, label }: { score: number; label: string }) {
  // Color calculation based on score
  const colorClass = 
    score >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200/50' :
    score >= 50 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200/50' :
    'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200/50';

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all duration-300 shadow-sm",
        colorClass
      )}
      title={`Dopasowanie: ${score}%`}
    >
      <Target className="w-3.5 h-3.5 animate-pulse" /> {score}% · {label}
    </span>
  );
}

function AnnouncementCard({
  ad, index, isFavorite, isSelected, match, status, onToggleFavorite, onShowOnMap, onSetStatus, onQuickView,
}: {
  ad: DisplayAnnouncement;
  index: number;
  isFavorite: boolean;
  isSelected: boolean;
  match: MatchResult | null;
  status: ApplicationStatus | null;
  onToggleFavorite: () => void;
  onShowOnMap: () => void;
  onSetStatus: (s: ApplicationStatus) => void;
  onQuickView?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { share, copied } = useShare();
  
  // Clean up search query from active window context to highlight text
  const [searchWord, setSearchWord] = useState('');
  useEffect(() => {
    // Locate the search input value dynamically if not passed directly
    const input = document.querySelector('input[placeholder*="Szukaj ogłoszeń"]') as HTMLInputElement;
    if (input) {
      setSearchWord(input.value);
      const handleInput = () => setSearchWord(input.value);
      input.addEventListener('input', handleInput);
      return () => input.removeEventListener('input', handleInput);
    }
  }, []);

  const priceDisplay = ad.price
    ? typeof ad.price === 'number' 
      ? `${ad.price.toLocaleString('pl-PL')} zł/mies.` 
      : ad.price
    : null;
    
  const hasLocation = ad.latitude !== null && ad.longitude !== null;
  
  const portalColors: Record<string, string> = {
    'pracuj.pl': '#10b981', // Emerald
    'olx': '#2563eb', // Indigo Blue
    'indeed': '#6366f1', // Indigo
    'oferteo': '#f97316', // Orange
    'fixly': '#a855f7', // Purple
  };
  
  const portalColor = portalColors[ad.source_portal.toLowerCase()] || '#6b7280';
  const statusMeta = status ? STATUS_META[status] : null;

  const handleSwipeEnd = (_: unknown, info: PanInfo) => {
    triggerHaptic(12);
    if (info.offset.x > 80) {
      onToggleFavorite();
    } else if (info.offset.x < -80) {
      onSetStatus(status === 'applied' ? 'interview' : 'applied');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25), duration: 0.3, ease: 'easeOut' }}
      className="relative rounded-2xl overflow-hidden my-1"
    >
      {/* Background Swipe Actions Indicator */}
      <div className="absolute inset-0 flex items-center justify-between px-6 font-bold text-xs pointer-events-none rounded-2xl overflow-hidden bg-muted/40 border border-border/30">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black">
          <Heart className="w-5 h-5 fill-current" />
          <span>Polubiono</span>
        </div>
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black">
          <span>Zaaplikowano</span>
          <Briefcase className="w-5 h-5" />
        </div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleSwipeEnd}
        layout
      >
        <Card
          className={cn(
            'group cursor-pointer transition-all duration-300 overflow-hidden border border-border/60 backdrop-blur-md',
            isSelected 
              ? 'bg-gradient-to-r from-primary/5 via-card to-card border-primary ring-2 ring-primary/10 shadow-md' 
              : 'hover:border-primary/40 hover:shadow-md hover:bg-accent/10 dark:hover:bg-accent/5'
          )}
          onClick={() => setExpanded(!expanded)}
        >
          <CardContent className="p-0">
            <div className="p-4.5">
              <div className="flex items-start gap-3.5">
                {/* Portal status pillar */}
                <div 
                  className="w-1.5 self-stretch rounded-full shrink-0 transition-all duration-300 shadow-xs"
                  style={{ backgroundColor: portalColor }}
                  title={ad.source_portal}
                />

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Top Row: Category / Portal badge & quick actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span 
                        className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border shadow-2xs"
                        style={{ 
                          backgroundColor: `${portalColor}12`, 
                          borderColor: `${portalColor}25`, 
                          color: portalColor 
                        }}
                      >
                        {ad.source_portal}
                      </span>
                      {ad.employment_type && (
                        <span className="text-[9px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border/40">
                          {ad.employment_type}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {onQuickView && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic(10);
                            onQuickView();
                          }}
                          className="shrink-0 p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                          title="Szybki podgląd"
                          aria-label="Szybki podgląd ogłoszenia"
                        >
                          <Sparkles className="w-4 h-4 text-emerald-500" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playUiChime('like');
                          triggerHaptic(12);
                          onToggleFavorite();
                        }}
                        className={cn(
                          'shrink-0 p-1.5 rounded-full transition-all duration-300 active:scale-90', 
                          isFavorite 
                            ? 'text-red-500 bg-red-50 dark:bg-red-950/60 shadow-sm' 
                            : 'text-muted-foreground/35 hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20'
                        )}
                        aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                      >
                        <Heart className={cn('w-4 h-4 transition-transform duration-300', isFavorite && 'fill-current scale-110')} />
                      </button>
                    </div>
                  </div>

                {/* Title */}
                <h3 className="font-bold text-sm md:text-base text-foreground leading-snug tracking-tight hover:text-primary transition-colors duration-200">
                  <a
                    href={ensureAbsoluteUrl(ad.source_url) || `/announcements/${ad.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline inline-flex items-center gap-1.5"
                    title="Otwórz ogłoszenie w nowej karcie"
                  >
                    <HighlightText text={ad.title} query={searchWord} />
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0 inline" />
                  </a>
                </h3>

                {/* Match score & Application status */}
                {(match || statusMeta) && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {match && match.score < 100 && <MatchBadge score={match.score} label={match.reasons[0]?.label || 'Dopasowanie'} />}
                    {statusMeta && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm transition-all duration-300"
                        style={{ 
                          background: `${statusMeta.color}12`, 
                          borderColor: `${statusMeta.color}30`,
                          color: statusMeta.color 
                        }}
                      >
                        {statusMeta.icon} {statusMeta.label}
                      </span>
                    )}
                  </div>
                )}

                {/* Middle line: Company details */}
                {ad.company && (
                  <p className="text-xs font-semibold text-foreground/70 flex items-center gap-1.5">
                    🏢 {ad.company}
                  </p>
                )}

                {/* Bottom line: Location, time, price */}
                <div className="flex items-center justify-between gap-4 pt-1 flex-wrap border-t border-border/30">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                      <MapPin className="w-3.5 h-3.5 text-primary/70" /> {ad.location_text}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {ad.posted_days_ago !== null && ad.posted_days_ago !== undefined
                        ? (ad.posted_days_ago === 0 ? 'Dzisiaj' : ad.posted_days_ago === 1 ? 'Wczoraj' : `${ad.posted_days_ago} dni temu`)
                        : formatTimeAgo(ad.scraped_at)
                      }
                    </span>
                  </div>
                  
                  {priceDisplay && (
                    <span className="text-xs md:text-sm font-black text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10 shadow-sm">
                      {priceDisplay}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details dropdown */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden bg-muted/30 dark:bg-muted/10 border-t border-border/40"
              >
                <div className="p-4.5 space-y-4">
                  {/* Detailed Description */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Opis ogłoszenia</h4>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-line bg-background/50 p-3 rounded-lg border border-border/30">
                      <HighlightText text={ad.description} query={searchWord} />
                    </p>
                  </div>

                  {/* Reasons list (positive & negative matching criteria) */}
                  {match && match.reasons.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Analiza dopasowania preferencji</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {match.reasons.map((r, ri) => (
                          <span
                            key={ri}
                            className={cn(
                              'inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg border shadow-sm transition-all',
                              r.positive 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40'
                                : 'bg-muted text-muted-foreground border-border/60'
                            )}
                          >
                            <span>{r.positive ? '🟢' : '⚪'}</span>
                            <span>{r.label}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Change status actions */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Aktualny status oferty</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(STATUS_META) as ApplicationStatus[]).map((s) => {
                        const meta = STATUS_META[s];
                        const active = status === s;
                        return (
                          <button
                            key={s}
                            onClick={(e) => { e.stopPropagation(); onSetStatus(s); }}
                            className={cn(
                              'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all duration-200 active:scale-95 cursor-pointer shadow-sm',
                              active 
                                ? 'text-white border-transparent scale-105 shadow-md' 
                                : 'text-muted-foreground border-border/80 bg-background hover:bg-accent/80 hover:text-foreground'
                            )}
                            style={active ? { backgroundColor: meta.color } : undefined}
                          >
                            <span className="text-xs">{meta.icon}</span>
                            <span>{meta.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                    <a
                      href={ensureAbsoluteUrl(ad.source_url) || `/announcements/${ad.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1"
                    >
                      <Button variant="default" size="sm" className="w-full gap-2 text-xs font-bold shadow-md cursor-pointer hover:scale-[1.01] transition-transform">
                        <ExternalLink className="w-4 h-4" /> {ad.source_url ? `Zobacz w ${ad.source_portal || 'źródle'}` : 'Otwórz ogłoszenie'}
                      </Button>
                    </a>
                    {hasLocation && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); onShowOnMap(); }}
                          className="gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
                        >
                          <MapIcon className="w-4 h-4 text-primary" /> Na mapie
                        </Button>
                        {onQuickView && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); onQuickView(); }}
                            className="gap-1 text-xs font-semibold shadow-sm cursor-pointer"
                          >
                            👁️ Podgląd
                          </Button>
                        )}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${ad.latitude},${ad.longitude}&travelmode=transit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                        >
                          🚌 Dojazd ZDiTM
                        </a>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        share({ 
                          title: ad.title, 
                          text: `${ad.title} w ${ad.location_text}`, 
                          url: ad.source_url || window.location.href 
                        });
                      }}
                      className="gap-1.5 text-xs cursor-pointer hover:bg-accent"
                      title="Udostępnij ofertę"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  );
}

// --- Loading Skeleton ---

function ListSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

// --- Legacy Notifications removed in favor of NotificationsView component ---

// --- Main Page ---

export default function HomePage() {
  const router = useRouter();
  const { isGuest } = useAuth();

  // Show landing hero on first visit (before user has interacted with the app)
  const [showHero, setShowHero] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('naetacie-hero-dismissed')) {
      setShowHero(true);
    }
  }, []);

  const { announcements, isLive } = useRealtimeAnnouncements(50);
  const { isOnline, saveToCache } = useOfflineSync();
  const { ads: scrapedAds, loading: scrapeLoading, lastScrapedAt, scrapeNow } = useScraper();
  const { isFavorite, toggleFavorite, favoriteCount } = useFavorites();
  const { preferences, update: updatePreferences, reset: resetPreferences } = useJobPreferences();
  const { setStatus, getStatus, count: trackedCount } = useApplicationTracking();
  const pushNotifications = usePushNotifications();

  const [prefsPanelOpen, setPrefsPanelOpen] = useState(false);
  const [showTrackedOnly, setShowTrackedOnly] = useState(false);
  const { show: showToast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [guestPrompt, setGuestPrompt] = useState<string | null>(null);

  // --- Filters shared by map AND list ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleVoiceSearch = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition || (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('error', 'Wyszukiwanie głosowe nie jest wspierane w tej przeglądarce.');
      return;
    }

    triggerHaptic(15);
    const recognition = new SpeechRecognition();
    recognition.lang = 'pl-PL';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setSearchQuery(transcript);
        triggerHaptic([10, 20, 10]);
        showToast('success', `Rozpoznano głosowo: "${transcript}"`);
      }
    };

    recognition.start();
  }, [showToast]);

  const [sortBy, setSortBy] = useState<SortOption>('match');
  const [filterPortal, setFilterPortal] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Set<CategoryKey>>(
    () => new Set(ALL_CATEGORY_KEYS)
  );

  // --- Salary & Comparison Modals ---
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [salaryCalcGross, setSalaryCalcGross] = useState<number | null>(null);

  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [comparedAdIds, setComparedAdIds] = useState<Set<string>>(new Set());

  // --- Quick View Drawer & Command Palette State ---
  const [quickViewAd, setQuickViewAd] = useState<DisplayAnnouncement | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // --- Map <-> List selection sync ---
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyToken, setFlyToken] = useState(0);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Merge realtime + scraped data into one normalized shape
  const allAnnouncements = useMemo((): DisplayAnnouncement[] => {
    const fromRealtime: DisplayAnnouncement[] = announcements.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      source_url: a.source_url || '',
      source_portal: a.source_portal,
      category: a.category || '',
      location_text: a.location_text,
      latitude: a.latitude,
      longitude: a.longitude,
      price: a.price,
      phone: a.contact_info,
      scraped_at: a.scraped_at,
      published_at: a.published_at,
      company: a.company || null,
      employment_type: a.employment_type || null,
      posted_days_ago: a.posted_days_ago ?? null,
    }));

    const fromScraper: DisplayAnnouncement[] = scrapedAds.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      source_url: a.source_url,
      source_portal: a.source_portal,
      category: a.category,
      location_text: a.location_text,
      latitude: a.latitude,
      longitude: a.longitude,
      price: a.price,
      phone: null,
      scraped_at: new Date(a.scraped_at),
      published_at: a.published_at ? new Date(a.published_at) : null,
    }));

    const seen = new Set<string>();
    const merged: DisplayAnnouncement[] = [];
    for (const item of [...fromScraper, ...fromRealtime]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
    return merged;
  }, [announcements, scrapedAds]);

  // Precompute match scores once per (ads, preferences) change
  const matchMap = useMemo(() => {
    const m = new Map<string, MatchResult>();
    for (const ad of allAnnouncements) {
      m.set(ad.id, scoreMatch(ad, preferences));
    }
    return m;
  }, [allAnnouncements, preferences]);

  const prefsActive = !hasNoPreferences(preferences);

  // Market statistics over all announcements (salary levels, top location)
  const marketOverview = useMemo(() => computeMarketOverview(allAnnouncements), [allAnnouncements]);

  const isSearching = tokenize(searchQuery).length > 0;

  // Filters that apply to BOTH map and list (search, portal, favorites, sort)
  const filteredAds = useMemo(() => {
    // Ranked full-text search (diacritic-insensitive, field-weighted)
    let result = searchQuery.trim()
      ? searchAnnouncements(allAnnouncements, searchQuery)
      : [...allAnnouncements];

    if (filterPortal !== 'all') {
      result = result.filter((a) => a.source_portal === filterPortal);
    }

    if (showFavoritesOnly) {
      result = result.filter((a) => isFavorite(a.id));
    }

    if (showTrackedOnly) {
      result = result.filter((a) => getStatus(a.id) !== null);
    }

    const scoreOf = (id: string) => matchMap.get(id)?.score ?? 0;

    switch (sortBy) {
      case 'match':
        // Active search + default sort => keep search relevance ranking as-is.
        if (searchQuery.trim()) break;
        // With active preferences, rank by score; otherwise fall back to newest
        if (prefsActive) {
          result.sort((a, b) => scoreOf(b.id) - scoreOf(a.id) || b.scraped_at.getTime() - a.scraped_at.getTime());
        } else {
          result.sort((a, b) => b.scraped_at.getTime() - a.scraped_at.getTime());
        }
        break;
      case 'newest':
        result.sort((a, b) => b.scraped_at.getTime() - a.scraped_at.getTime());
        break;
      case 'oldest':
        result.sort((a, b) => a.scraped_at.getTime() - b.scraped_at.getTime());
        break;
      case 'price-asc':
        result.sort((a, b) => (extractNumPrice(a.price) ?? 9999999) - (extractNumPrice(b.price) ?? 9999999));
        break;
      case 'price-desc':
        result.sort((a, b) => (extractNumPrice(b.price) ?? 0) - (extractNumPrice(a.price) ?? 0));
        break;
    }

    return result;
  }, [allAnnouncements, searchQuery, filterPortal, showFavoritesOnly, showTrackedOnly, sortBy, isFavorite, getStatus, matchMap, prefsActive]);

  // Save to cache
  useEffect(() => {
    if (allAnnouncements.length > 0 && isOnline) {
      saveToCache(allAnnouncements);
    }
  }, [allAnnouncements, isOnline, saveToCache]);

  // Auto-scrape on first load
  useEffect(() => {
    if (allAnnouncements.length === 0 && !scrapeLoading) {
      scrapeNow(undefined, 40);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Cross-navigation handlers ---

  /** Marker clicked on the map: select it, and if we're already on the list, scroll to it */
  const handleMarkerClick = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  /** "Zobacz na liście" from a map popup: switch tabs + scroll to the card */
  const handleShowInList = useCallback((id: string) => {
    setSelectedId(id);
    setActiveTab('list');
    // Wait for the tab switch to render the list before scrolling
    requestAnimationFrame(() => {
      setTimeout(() => {
        cardRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    });
  }, []);

  /** "Pokaż na mapie" from a list card: switch to map tab + fly to marker */
  const handleShowOnMap = useCallback((id: string) => {
    setSelectedId(id);
    setFlyToken((t) => t + 1);
    setActiveTab('map');
  }, []);

  function handleTabChange(tab: TabId) {
    if (isGuest && (tab === 'notifications' || tab === 'profile')) {
      setGuestPrompt(tab);
      return;
    }
    setActiveTab(tab);
  }

  // Power-user keyboard shortcuts
  useKeyboardShortcuts({
    onFocusSearch: () => { setActiveTab('list'); setTimeout(() => searchInputRef.current?.focus(), 60); },
    onEscape: () => { setPrefsPanelOpen(false); setGuestPrompt(null); },
    onTab: (t) => handleTabChange(t as TabId),
  });

  function renderContent() {
    switch (activeTab) {
      case 'map': {
        return (
          <div className="w-full h-[calc(100dvh-120px)] md:h-[100dvh] relative overflow-hidden">
            <MapViewDynamic
              ads={filteredAds.filter(isSzczecinAnnouncement)}
              totalCount={allAnnouncements.length}
              activeCategories={activeCategories}
              onCategoryChange={setActiveCategories}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              selectedId={selectedId}
              flyToken={flyToken}
              onMarkerClick={handleMarkerClick}
              onShowInList={handleShowInList}
              onSearchArea={(_bounds: { south: number; west: number; north: number; east: number }) => {
                setSearchQuery('');
              }}
              homeLat={preferences.homeLat}
              homeLng={preferences.homeLng}
              maxDistanceKm={preferences.maxDistanceKm}
            />
          </div>
        );
      }

      case 'list': {
        // The list additionally respects the map's category filter chips,
        // so toggling a category on the map also narrows the list.
        const listAds = filteredAds.filter((a) => activeCategories.has(normalizeCategory(a.category)));

        return (
          <div className="max-w-3xl mx-auto">
            {/* Search + Filters Header */}
            <div className="sticky top-12 md:top-0 z-10 glass border-b border-border/50 px-4 py-3 space-y-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <div className="relative min-w-[220px] flex-1 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder={isListening ? 'Słucham...' : 'Szukaj ogłoszeń... (naciśnij /)'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn('pl-9 pr-16 h-9 transition-all', isListening && 'border-primary ring-2 ring-primary/20 animate-pulse')}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={handleVoiceSearch}
                      className={cn(
                        'p-1.5 rounded-md transition-all active:scale-90',
                        isListening ? 'text-red-500 bg-red-50 dark:bg-red-950/60 animate-bounce' : 'text-muted-foreground hover:text-foreground'
                      )}
                      title="Wyszukaj głosem"
                      aria-label="Wyszukaj głosem"
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="p-1 text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <RecentSearchChips currentQuery={searchQuery} onSelectQuery={setSearchQuery} />
                <Button
                  variant={pushNotifications.permission === 'granted' ? 'default' : 'outline'}
                  size="sm"
                  onClick={async () => {
                    const granted = await pushNotifications.requestPermission();
                    if (granted) {
                      showToast('success', 'Powiadomienia PWA zostały włączone!');
                      pushNotifications.sendNotification('NaEtacie', { body: 'Powiadomienia o ogłoszeniach są aktywne!' });
                    } else {
                      showToast('error', 'Włącz powiadomienia w ustawieniach przeglądarki.');
                    }
                  }}
                  className="gap-1 text-xs"
                  title="Powiadomienia Push PWA"
                >
                  🔔 {pushNotifications.permission === 'granted' ? 'Aktywne' : 'Powiadomienia'}
                </Button>
                <Button
                  variant={prefsActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPrefsPanelOpen(true)}
                  className="gap-1"
                  title="Dopasowanie ofert"
                >
                  <Target className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSalaryCalcGross(6000);
                    setSalaryModalOpen(true);
                  }}
                  className="gap-1 text-xs"
                  title="Kalkulator wynagrodzeń Netto/Brutto"
                >
                  💰 Netto
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompareModalOpen(true)}
                  className="gap-1 text-xs relative"
                  title="Porównywarka ofert"
                >
                  ⚖️ Porównaj
                  {comparedAdIds.size > 0 && (
                    <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold inline-flex items-center justify-center -mr-1">
                      {comparedAdIds.size}
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    triggerHaptic(15);
                    const tracked = allAnnouncements.filter((a) => getStatus(a.id) || isFavorite(a.id));
                    const target = tracked.length > 0 ? tracked : listAds;
                    exportApplicationsToCSV(target, (id) => {
                      const s = getStatus(id);
                      return s ? STATUS_META[s].label : isFavorite(id) ? 'Ulubione' : 'Obserwowane';
                    });
                    showToast('success', `Wygenerowano plik CSV (${target.length} ofert)`);
                  }}
                  className="gap-1 text-xs"
                  title="Pobierz swoje aplikacje i zapisane oferty do pliku CSV"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCommandPaletteOpen(true)}
                  className="gap-1 text-xs"
                  title="Paleta Komend (Ctrl+K)"
                >
                  ⌨️ Ctrl+K
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={cn('gap-1', showFilters && 'bg-accent')}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => scrapeNow(undefined, 40)} disabled={scrapeLoading} className="gap-1" title="Odśwież oferty">
                  {scrapeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </Button>
              </div>

              {/* One-tap popular trade searches */}
              <QuickSearchChips value={searchQuery} onChange={setSearchQuery} />
              
              {/* Market Pulse Bar */}
              <MarketPulseBar ads={listAds} totalCount={allAnnouncements.length} />

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-wrap items-center gap-2 overflow-hidden"
                  >
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="h-8 px-2 text-xs rounded-md border border-input bg-background"
                    >
                      <option value="match">Dopasowanie</option>
                      <option value="newest">Najnowsze</option>
                      <option value="oldest">Najstarsze</option>
                      <option value="price-asc">Płaca ↑</option>
                      <option value="price-desc">Płaca ↓</option>
                    </select>

                    <select
                      value={filterPortal}
                      onChange={(e) => setFilterPortal(e.target.value)}
                      className="h-8 px-2 text-xs rounded-md border border-input bg-background"
                    >
                      <option value="all">Wszystkie portale</option>
                      <option value="olx">OLX</option>
                      <option value="oferteo">Oferteo</option>
                      <option value="fixly">Fixly</option>
                    </select>

                    <Button
                      variant={showFavoritesOnly ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                      className="h-8 text-xs gap-1"
                    >
                      <Heart className={cn('w-3 h-3', showFavoritesOnly && 'fill-current')} />
                      Ulubione ({favoriteCount})
                    </Button>

                    <Button
                      variant={showTrackedOnly ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowTrackedOnly(!showTrackedOnly)}
                      className="h-8 text-xs gap-1"
                    >
                      <Briefcase className="w-3 h-3" />
                      Śledzone ({trackedCount})
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {listAds.length} {listAds.length === 1 ? 'wynik' : 'wyników'}
                  {isSearching && <span className="ml-1 text-primary">· wyszukiwanie</span>}
                  {isLive && <span className="ml-1 text-emerald-500">● Na żywo</span>}
                </span>
                {lastScrapedAt && <span>Scraping: {formatTimeAgo(lastScrapedAt)}</span>}
              </div>
            </div>

            {/* Market insights — only when not actively searching/filtering to favorites */}
            {!isSearching && !showFavoritesOnly && !showTrackedOnly && (
              <MarketStats overview={marketOverview} />
            )}

            {/* List */}
            {scrapeLoading && allAnnouncements.length === 0 ? (
              <ListSkeleton />
            ) : listAds.length === 0 ? (
              <div className="p-8 text-center">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {searchQuery ? 'Brak wyników dla tego wyszukiwania' : showFavoritesOnly ? 'Brak ulubionych ogłoszeń' : 'Brak ogłoszeń'}
                  </p>
                  {!searchQuery && !showFavoritesOnly && (
                    <Button variant="outline" className="mt-4" onClick={() => scrapeNow(undefined, 40)} disabled={scrapeLoading}>
                      {scrapeLoading ? 'Scrapuję...' : 'Pobierz ogłoszenia'}
                    </Button>
                  )}
                </motion.div>
              </div>
            ) : (
              <PullToRefresh onRefresh={async () => { triggerHaptic(15); await scrapeNow(undefined, 40); }}>
                <div className="p-4 space-y-3">
                  {listAds.map((ad, i) => (
                    <div
                      key={ad.id}
                      ref={(el) => {
                        if (el) cardRefs.current.set(ad.id, el);
                        else cardRefs.current.delete(ad.id);
                      }}
                    >
                      <AnnouncementCard
                        ad={ad}
                        index={i}
                        isFavorite={isFavorite(ad.id)}
                        isSelected={ad.id === selectedId}
                        match={prefsActive ? matchMap.get(ad.id) ?? null : null}
                        status={getStatus(ad.id)}
                        onToggleFavorite={() => {
                          const wasFav = isFavorite(ad.id);
                          toggleFavorite(ad.id);
                          showToast('success', wasFav ? 'Usunięto z ulubionych' : 'Dodano do ulubionych ❤️');
                        }}
                        onShowOnMap={() => handleShowOnMap(ad.id)}
                        onSetStatus={(s) => {
                          setStatus(ad.id, s);
                          showToast('info', `Status: ${STATUS_META[s].label}`);
                        }}
                        onQuickView={() => setQuickViewAd(ad)}
                      />
                    </div>
                  ))}
                </div>
              </PullToRefresh>
            )}
          </div>
        );
      }

      case 'notifications':
        return <NotificationsView />;
      case 'profile':
        return <ProfileSettings />;
      default:
        return null;
    }
  }

  // Hero landing for first-time guests (rendered AFTER all hooks)
  if (showHero && isGuest) {
    return (
      <Hero onContinue={() => {
        localStorage.setItem('naetacie-hero-dismissed', '1');
        setShowHero(false);
      }} />
    );
  }

  return (
    <>
      <ServiceWorkerRegistration />
      <PwaInstallPrompt />
      <JobPreferencesPanel
        open={prefsPanelOpen}
        preferences={preferences}
        onClose={() => setPrefsPanelOpen(false)}
        onChange={updatePreferences}
        onReset={resetPreferences}
      />
      <AppShell activeTab={activeTab} onTabChange={handleTabChange} isLive={isLive}>
        {!isOnline && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>Brak połączenia z siecią. Przeglądasz zapisane oferty offline.</span>
          </div>
        )}
        <AnimatePresence>
          {isGuest && !bannerDismissed && <GuestBanner onDismiss={() => setBannerDismissed(true)} />}
        </AnimatePresence>
        {renderContent()}
      </AppShell>

      {/* Gross to Net Salary Calculator Modal */}
      <SalaryNetModal
        isOpen={salaryModalOpen}
        initialGross={salaryCalcGross}
        onClose={() => setSalaryModalOpen(false)}
      />

      {/* Side-by-Side Job Comparison Matrix Modal */}
      <JobComparisonModal
        isOpen={compareModalOpen}
        ads={allAnnouncements.filter((a) => comparedAdIds.has(a.id))}
        onClose={() => setCompareModalOpen(false)}
        onRemove={(id) => {
          setComparedAdIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }}
      />

      {/* Kinematic Quick-View Announcement Drawer */}
      <KinematicQuickView
        ad={quickViewAd}
        isOpen={quickViewAd !== null}
        onClose={() => setQuickViewAd(null)}
        isFavorite={quickViewAd ? isFavorite(quickViewAd.id) : false}
        onToggleFavorite={() => quickViewAd && toggleFavorite(quickViewAd.id)}
        onShowOnMap={() => {
          if (quickViewAd) {
            handleShowOnMap(quickViewAd.id);
            setQuickViewAd(null);
          }
        }}
      />

      {/* Command Palette Modal (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        ads={allAnnouncements}
        onSelectAd={(id) => {
          handleShowOnMap(id);
          const found = allAnnouncements.find((a) => a.id === id);
          if (found) setQuickViewAd(found);
        }}
        onSelectTab={(tab) => handleTabChange(tab)}
        onOpenCalculator={() => {
          setSalaryCalcGross(6000);
          setSalaryModalOpen(true);
        }}
        onOpenCompare={() => setCompareModalOpen(true)}
        onFilterSalaryOnly={() => {
          setActiveTab('list');
          setSearchQuery('zł');
        }}
        onFilterRemoteOnly={() => {
          setActiveTab('list');
          setSearchQuery('zdalna');
        }}
      />

      {/* Guest prompt modal */}
      <AnimatePresence>
        {guestPrompt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setGuestPrompt(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-foreground mb-2">Wymagane logowanie</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {guestPrompt === 'notifications' ? 'Zaloguj się, aby ustawić powiadomienia.' : 'Zaloguj się, aby zarządzać profilem.'}
              </p>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => router.push('/login')}>Zaloguj się</Button>
                <Button variant="ghost" className="w-full" onClick={() => setGuestPrompt(null)}>Kontynuuj przeglądanie</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// --- Helpers ---

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'teraz';
  if (minutes < 60) return `${minutes} min temu`;
  if (hours < 24) return `${hours}h temu`;
  if (days < 7) return `${days}d temu`;
  return date.toLocaleDateString('pl-PL');
}

function extractNumPrice(price: string | number | null): number | null {
  if (price === null) return null;
  if (typeof price === 'number') return price;
  const match = price.replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/);
  return match ? parseFloat(match[1].replace(',', '.')) : null;
}
