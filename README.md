# 🏗️ NaEtacie — oferty pracy budowlanej w Szczecinie

Agregator realnych ofert pracy budowlanej z rejonu Szczecina. Zbiera ogłoszenia z OLX (API v1), Pracuj.pl, Indeed — z interaktywną mapą, silnikiem dopasowania, śledzeniem aplikacji i automatycznym odświeżaniem co 6h.

## 🚀 Szybki start

```bash
# Instalacja zależności
npm install --legacy-peer-deps

# Uruchomienie (development)
npm run dev

# Załadowanie danych do Firestore
# Wejdź na: http://localhost:3000/api/seed

# Build produkcyjny
npm run build && npm start
```

## 📋 Funkcjonalności

### Mapa interaktywna
- Markery kolorowane wg kategorii (budowa, remont, instalacje, wykończenia)
- Klastrowanie markerów dla wydajności
- Geolokalizacja użytkownika
- Popup z detalami ogłoszenia, ceną i kontaktem
- Legenda kategorii

### Lista ogłoszeń
- Wyszukiwarka (tytuł, opis, lokalizacja)
- Filtrowanie po portalu (OLX / Oferteo / Fixly)
- Sortowanie (najnowsze, najstarsze, cena ↑↓)
- Ulubione (❤️) z persistencją w localStorage
- Karty z linkiem do źródła i ceną

### Autentykacja
- Logowanie email/hasło z walidacją siły hasła
- Google Sign-In (popup)
- Tryb gościa (bez logowania, dane opóźnione 48h)
- Weryfikacja email z resend

### Real-time sync
- Firestore onSnapshot dla zalogowanych (sync między urządzeniami)
- Fallback na REST API + seed data dla gości

### Offline & PWA
- Service Worker z cache-first dla statyki
- Network-first z fallback dla API
- Offline indicator w UI
- Web App Manifest

### Powiadomienia push
- Notification API + Service Worker
- Opt-in w zakładce Powiadomienia

### Dark mode
- Automatyczna synchronizacja z systemem (prefers-color-scheme)
- Manual toggle: Jasny / Ciemny / Systemowy
- Tailwind CSS dark class

### Bezpieczeństwo
- CSP headers (Content-Security-Policy)
- Rate limiting (auth: 5/min, general: 30/min)
- Body size limit (10KB POST/PUT/PATCH)
- X-Content-Type-Options, X-Frame-Options, Referrer-Policy

## 🗂️ Architektura

```
app/
├── api/
│   ├── announcements/   # REST API z walidacją, paginacją, maskingiem
│   ├── scrape/          # On-demand scraper (OLX + Oferteo)
│   └── seed/            # Seed Firestore z danymi
├── login/               # Strona logowania/rejestracji
├── announcements/[id]/  # Szczegóły ogłoszenia
├── globals.css          # Tailwind v4 + shadcn tokens
├── layout.tsx           # Root layout + providers
├── page.tsx             # Strona główna (mapa + lista + profil)
└── providers.tsx        # Auth + Theme + Toast providers

components/
├── map/                 # MapView, MapViewDynamic (SSR-safe)
├── navigation/          # AppShell, BottomNav, ResponsiveLayout
├── ui/                  # Button, Card, Input, Badge, Skeleton (shadcn)
├── theme/               # ThemeProvider (system sync)
├── feedback/            # ToastProvider, EmptyState, Skeletons
└── profile/             # ProfileSettings, ThemeToggle

lib/
├── auth/                # AuthContext, googleAuth, server verify
├── firebase/            # Admin SDK + Client SDK init
├── hooks/               # useRealtimeAnnouncements, useScraper, useFavorites, useOfflineSync, usePushNotifications
├── data/                # Static seed data (30 ogłoszeń)
├── types/               # TypeScript interfaces
├── validation/          # Input sanitization, form validation
└── middleware/          # Rate limiter

functions/src/           # Firebase Cloud Functions (Playwright scraper)
├── scraper/             # OLX, Oferteo, Fixly portal scrapers
├── deduplication/       # Dedup by content hash
├── geocoding/           # Nominatim + cache
├── notifications/       # Email digests
└── batch/               # Firestore batch writes
```

## 🛠️ Tech Stack

| Warstwa | Technologia |
|---------|-------------|
| Framework | Next.js 14 (App Router) |
| UI | Tailwind CSS v4, shadcn/ui, Radix UI |
| Animacje | Framer Motion |
| Mapa | Leaflet + react-leaflet + react-leaflet-cluster |
| Auth | Firebase Auth (email + Google) |
| Database | Cloud Firestore |
| Scraping | Playwright (Cloud Functions), fetch (API route) |
| Icons | Lucide React |
| Walidacja | Zod-style custom validators |
| Testy | Vitest + fast-check (property-based) |
| Typy | TypeScript 5.5 strict |

## 📦 Skrypty

| Komenda | Opis |
|---------|------|
| `npm run dev` | Serwer deweloperski |
| `npm run build` | Build produkcyjny |
| `npm run seed` | Seed danych do Firestore (tsx) |
| `npm run emulators` | Firebase emulators (wymaga Java 21) |
| `npm run test` | Testy (Vitest) |
| `npm run typecheck` | Sprawdzenie typów |
| `npm run lint` | ESLint |

## 🔑 Zmienne środowiskowe (.env.local)

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (service account JSON w jednej linii)
FIREBASE_SERVICE_ACCOUNT_KEY={...}

# SMTP (opcjonalne - email notifications)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

## 🗺️ Region

Aplikacja pokrywa region **Szczecina i okolic (50km)**:
- Szczecin (dzielnice: Centrum, Pogodno, Niebuszewo, Gumieńce, Prawobrzeże, Dąbie, Bezrzecze, Załom)
- Police, Stargard, Goleniów, Gryfino, Nowogard, Pyrzyce, Świnoujście

## 📄 Licencja

Projekt prywatny — wszystkie prawa zastrzeżone.
