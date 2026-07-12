'use client';

/**
 * Main app page — map and list are integrated into a single feature:
 * - Same search/sort/portal/favorites/category filters drive both views.
 * - Clicking a marker highlights the matching list card (and can jump to it).
 * - Clicking "Pokaż na mapie" on a card switches to the map tab and flies
 *   to that marker, opening its popup.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  MapPin, Clock, Sparkles, X, ArrowRight, RefreshCw, Loader2,
  Search, Heart, ExternalLink, SlidersHorizontal, Map as MapIcon,
  Target, Briefcase,
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
import { AppShell, type TabId } from '@/components/navigation/AppShell';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { JobPreferencesPanel } from '@/components/list/JobPreferencesPanel';
import { QuickSearchChips } from '@/components/list/QuickSearchChips';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ALL_CATEGORY_KEYS, normalizeCategory, type CategoryKey } from '@/lib/data/categories';
import { searchAnnouncements, tokenize } from '@/lib/search/engine';
import type { DisplayAnnouncement } from '@/lib/types/display';
import type { MatchResult } from '@/lib/matching/types';

import MapViewDynamic from '@/components/map/MapViewDynamic';
import { ProfileSettings } from '@/components/profile';
import { Hero } from '@/components/landing/Hero';

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

function MatchBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#16a34a' : score >= 55 ? '#d97706' : '#6b7280';
  const label = score >= 80 ? 'Świetne' : score >= 55 ? 'Dobre' : 'Słabe';
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${color}18`, color }}
      title={`Dopasowanie: ${score}%`}
    >
      <Target className="w-3 h-3" /> {score}% · {label}
    </span>
  );
}

function AnnouncementCard({
  ad, index, isFavorite, isSelected, match, status, onToggleFavorite, onShowOnMap, onSetStatus,
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
}) {
  const [expanded, setExpanded] = useState(false);
  const priceDisplay = ad.price
    ? typeof ad.price === 'number' ? `${ad.price} zł/mies.` : ad.price
    : null;
  const hasLocation = ad.latitude !== null && ad.longitude !== null;
  const portalColors: Record<string, string> = {
    'pracuj.pl': '#00a656',
    'olx': '#002f34',
    'indeed': '#2557a7',
    'oferteo': '#ff6600',
  };
  const portalColor = portalColors[ad.source_portal] || '#6b7280';
  const statusMeta = status ? STATUS_META[status] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      layout
    >
      <Card
        className={cn(
          'group cursor-pointer transition-all duration-300 overflow-hidden',
          isSelected ? 'border-primary ring-2 ring-primary/20 shadow-lg' : 'hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="p-0">
          {/* Header row */}
          <div className="p-4 pb-3">
            <div className="flex items-start gap-3">
              {/* Portal indicator dot */}
              <div
                className="mt-1 shrink-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: portalColor }}
                title={ad.source_portal}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                    {ad.title}
                  </h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                    className={cn('shrink-0 p-1.5 rounded-full transition-all', isFavorite ? 'text-red-500 bg-red-50 dark:bg-red-950' : 'text-muted-foreground/30 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950')}
                    aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                  >
                    <Heart className={cn('w-4 h-4', isFavorite && 'fill-current')} />
                  </button>
                </div>

                {/* Match score + status badges */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {match && match.score < 100 && <MatchBadge score={match.score} />}
                  {statusMeta && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${statusMeta.color}18`, color: statusMeta.color }}
                    >
                      {statusMeta.icon} {statusMeta.label}
                    </span>
                  )}
                </div>

                {/* Company & employment type */}
                {(ad.company || ad.employment_type) && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {ad.company && (
                      <span className="text-xs font-medium text-foreground/80">{ad.company}</span>
                    )}
                    {ad.employment_type && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{ad.employment_type}</Badge>
                    )}
                  </div>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" /> {ad.location_text}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {ad.posted_days_ago !== null && ad.posted_days_ago !== undefined
                      ? (ad.posted_days_ago === 0 ? 'Dzisiaj' : ad.posted_days_ago === 1 ? 'Wczoraj' : `${ad.posted_days_ago} dni temu`)
                      : formatTimeAgo(ad.scraped_at)
                    }
                  </span>
                  {priceDisplay && (
                    <span className="text-xs font-bold text-primary">{priceDisplay}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Expandable detail section */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-1 border-t border-border/50 space-y-3">
                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {ad.description}
                  </p>

                  {/* Match reasons */}
                  {match && match.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {match.reasons.map((r, ri) => (
                        <span
                          key={ri}
                          className={cn('text-[10px] px-2 py-0.5 rounded-full',
                            r.positive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                       : 'bg-muted text-muted-foreground')}
                        >
                          {r.positive ? '✓' : '·'} {r.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Application status tracker */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status aplikacji</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(STATUS_META) as ApplicationStatus[]).map((s) => {
                        const meta = STATUS_META[s];
                        const active = status === s;
                        return (
                          <button
                            key={s}
                            onClick={(e) => { e.stopPropagation(); onSetStatus(s); }}
                            className={cn('text-[11px] px-2 py-1 rounded-full border transition-colors',
                              active ? 'text-white border-transparent' : 'text-muted-foreground border-border hover:bg-accent')}
                            style={active ? { background: meta.color } : undefined}
                          >
                            {meta.icon} {meta.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Source portal badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${portalColor}15`, color: portalColor }}
                    >
                      {ad.source_portal}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {ad.source_url && (
                      <a
                        href={ad.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1"
                      >
                        <Button variant="default" size="sm" className="w-full gap-1.5 text-xs">
                          <ExternalLink className="w-3.5 h-3.5" /> Zobacz ogłoszenie
                        </Button>
                      </a>
                    )}
                    {hasLocation && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onShowOnMap(); }}
                        className="gap-1.5 text-xs"
                      >
                        <MapIcon className="w-3.5 h-3.5" /> Na mapie
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
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

// --- Notifications View ---

function NotificationsView() {
  const { permission, isSupported, requestPermission } = usePushNotifications();
  return (
    <div className="p-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader><CardTitle className="text-lg">Powiadomienia Push</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!isSupported ? (
              <p className="text-sm text-muted-foreground">Twoja przeglądarka nie obsługuje powiadomień push.</p>
            ) : permission === 'granted' ? (
              <div className="flex items-center gap-2">
                <Badge variant="success">Aktywne</Badge>
                <span className="text-sm text-muted-foreground">Otrzymasz powiadomienia o nowych ogłoszeniach.</span>
              </div>
            ) : permission === 'denied' ? (
              <p className="text-sm text-destructive">Powiadomienia zablokowane. Odblokuj w ustawieniach przeglądarki.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Włącz powiadomienia o nowych ogłoszeniach budowlanych.</p>
                <Button onClick={requestPermission} className="w-full">Włącz powiadomienia</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// --- Main Page ---

export default function HomePage() {
  const router = useRouter();
  const { isGuest } = useAuth();

  // Show landing hero on first visit (before user has interacted with the app)
  const [showHero, setShowHero] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('naetacie-hero-dismissed');
  });
  const { announcements, isLive } = useRealtimeAnnouncements(50);
  const { isOnline, saveToCache } = useOfflineSync();
  const { ads: scrapedAds, loading: scrapeLoading, lastScrapedAt, scrapeNow } = useScraper();
  const { isFavorite, toggleFavorite, favoriteCount } = useFavorites();
  const { preferences, update: updatePreferences, reset: resetPreferences } = useJobPreferences();
  const { setStatus, getStatus, count: trackedCount } = useApplicationTracking();

  const [prefsPanelOpen, setPrefsPanelOpen] = useState(false);
  const [showTrackedOnly, setShowTrackedOnly] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [guestPrompt, setGuestPrompt] = useState<string | null>(null);

  // --- Filters shared by map AND list ---
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('match');
  const [filterPortal, setFilterPortal] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Set<CategoryKey>>(
    () => new Set(ALL_CATEGORY_KEYS)
  );

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

  function renderContent() {
    switch (activeTab) {
      case 'map':
        return (
          <div className="h-[calc(100dvh-120px)] md:h-[100dvh] w-full">
            <MapViewDynamic
              ads={filteredAds}
              totalCount={allAnnouncements.length}
              activeCategories={activeCategories}
              onCategoryChange={setActiveCategories}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              selectedId={selectedId}
              flyToken={flyToken}
              onMarkerClick={handleMarkerClick}
              onShowInList={handleShowInList}
              onSearchArea={(_bounds) => {
                // Filter to only ads within the visible map bounds
                setSearchQuery('');
              }}
              homeLat={preferences.homeLat}
              homeLng={preferences.homeLng}
              maxDistanceKm={preferences.maxDistanceKm}
            />
          </div>
        );

      case 'list': {
        // The list additionally respects the map's category filter chips,
        // so toggling a category on the map also narrows the list.
        const listAds = filteredAds.filter((a) => activeCategories.has(normalizeCategory(a.category)));

        return (
          <div className="max-w-3xl mx-auto">
            {/* Search + Filters Header */}
            <div className="sticky top-12 md:top-0 z-10 glass border-b border-border/50 px-4 py-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Szukaj ogłoszeń..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  variant={prefsActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPrefsPanelOpen(true)}
                  className="gap-1"
                  title="Dopasowanie ofert"
                >
                  <Target className="w-3.5 h-3.5" />
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
                      onToggleFavorite={() => toggleFavorite(ad.id)}
                      onShowOnMap={() => handleShowOnMap(ad.id)}
                      onSetStatus={(s) => setStatus(ad.id, s)}
                    />
                  </div>
                ))}
              </div>
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
      <JobPreferencesPanel
        open={prefsPanelOpen}
        preferences={preferences}
        onClose={() => setPrefsPanelOpen(false)}
        onChange={updatePreferences}
        onReset={resetPreferences}
      />
      <AppShell activeTab={activeTab} onTabChange={handleTabChange} isLive={isLive}>
        <AnimatePresence>
          {isGuest && !bannerDismissed && <GuestBanner onDismiss={() => setBannerDismissed(true)} />}
        </AnimatePresence>
        {renderContent()}
      </AppShell>

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
