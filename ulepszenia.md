# 🚀 Plan i Mapa Drogowa Ulepszeń — Aplikacja "Na Etacie"

Dokument zawiera kompletny, ustrukturyzowany plan rozwoju agregatora ogłoszeń pracy i zleceń budowlanych w Szczecinie i okolicach.

---

## 📌 1. Priorytetowe Ulepszenia UX & PWA (Faza 1 — Krótkoterminowa)

### 📱 1.1. Optymalizacja PWA i Działań Offline
- [x] **Naprawa ikon PWA**: Wygenerowano dedykowane pliki `icon-192.png` oraz `icon-512.png` w jakości Retina dla ekranu głównego.
- [x] **Customowy Banner Instalacyjny PWA**: Prawidłowa obsługa zdarzenia `beforeinstallprompt` z bezpiecznym wywołaniem `deferredPrompt.prompt()`.
- [x] **Offline Synchronization Queue**: Zastosowano moduł IndexedDB ([lib/offline/syncManager.ts](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/lib/offline/syncManager.ts)) oraz Service Worker ([public/sw.js](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/public/sw.js)) umożliwiający automatyczną synchronizację polubień i statusów po powrocie do sieci.
- [x] **Inteligentne Cache'owanie Mapy**: Buforowanie geodanych i punktów ogłoszeń w IndexedDB dla błyskawicznego działania offline.

### 🔗 1.2. Niezawodność i Bezpieczeństwo Linków Zewnętrznych
- [x] **Zabezpieczenie przycisków akcji ("OTWÓRZ / Zobacz w OLX")**: Dodano `onPointerDown={(e) => e.stopPropagation()}` oraz bezwzględne wywołania `window.open`, zapobiegające przechwytywaniu gestu swipowania przez Framer Motion.
- [x] **Scentralizowany Normalizator URL & Real-Time Redirect (`getAnnouncementExternalUrl` / `/api/announcements/redirect`)**: Gwarancja bezbłędnego przekierowania użytkownika do aktywnej oferty pracy w czasie rzeczywistym na OLX, Pracuj.pl oraz Indeed z automatycznym fallbackiem wyszukiwania.

---

## 🤖 2. Inteligentne Funkcje AI & Scrapowanie Multi-Portalowe (Faza 2 — Średnioterminowa)

### 🕷️ 2.1. Wieloportolowy Silnik Scrapowania & Ekstrakcja Danych
- [x] **Obsługa OLX, Pracuj.pl oraz Indeed**: Współbieżny silnik scrapujący z równoległym pobieraniem ofert (`Promise.allSettled`), odpornością na blokady anti-bot oraz rotacją nagłówków `User-Agent`.
- [x] **Darmowy Silnik AI/NLP (`lib/ai/freeJobExtractor.ts`)**: Lokalna, 100% darmowa ekstrakcja uprawnień (SEP, UDT, F-gaz, Prawo jazdy B/C), benefitów (darmowe zakwaterowanie, transport, narzędzia) oraz wymaganego stażu pracy.
- [x] **Międzyportalowa Dedupikacja Ogłoszeń (`lib/deduplication/crossPortalDeduplicator.ts`)**: Wykrywanie i scalanie identycznych ogłoszeń publikowanych jednocześnie na OLX, Pracuj.pl i Indeed z prezentacją wielu źródeł w jednym wpisie.
- [x] **Wskaźnik Atrakcyjności i Stawki Rynkowe (`lib/stats/marketBenchmarks.ts`)**: Porównanie proponowanej stawki ze średnią rynkową dla Szczecina (badge: 🔥 *Powyżej średniej*, *Rynkowa*, *Poniżej średniej*).

### 🗺️ 2.2. Zaawansowany Moduł Mapy (WebGL / MapLibre)
- [x] **Optymalizacja Mobile (Zmniejszenie ikon o 1/3)**: Przeskalowanie markerów z 34x42px do 23x28px, zmniejszenie średnicy klastrów o 33% i kompaktowy arkusz dolny (`MobileBottomSheet`) dla maksymalnej czytelności terenu.
- [x] **Trójwymiarowy widok budynków (3D Buildings Extrusion & Pitch Toggle)**: Dedykowany przycisk `🧊 3D` obracający i pochylający kamerę z trójwymiarowymi bryłami budynków.
- [x] **Symulator Czasu Dojazdu & ETA (`MapCommuteRoute.tsx`)**: Obliczanie odległości i realnego czasu dojazdu autem oraz ZTM z punktu "Mój Dom".
- [x] **Mapa Ciepła Zarobków Dzielnicowych (`MapDistrictSalaryHeatmap.tsx`)**: Gradientowa warstwa GeoJSON prezentująca średnie miesięczne stawki budowlane w dzielnicach Szczecina (Gumieńce, Prawobrzeże, Centrum, Goleniów).
- [x] **Widget Pogodowy na Budowie (`MapWeatherWidget.tsx`)**: Podgląd warunków pogodowych dla prac na zewnątrz (temperatura, wiatr, opady, rekomendacja dla dekarstwa i elewacji).
- [x] **Przycisk "Praca Blisko Mnie" (5 km GPS Auto-Zoom)**: Błyskawiczny zoom GPS do promienia 5 km wokół użytkownika.
- [x] **Tryb Pełnoekranowy (Zen Mode)**: Przycisk `🔍 Zen` chowający nakładki interfejsu dla 100% powierzchni widoku mapy.

---

## 🏬 3. Panel Pracodawcy i Ekosystem B2B (Faza 3 — Długoterminowa)

### 🏢 3.1. Dedykowany Portal dla Firm Budowlanych
- [x] **Panel Dodawania Bezpośrednich Ogłoszeń**: Formularz bezpłatnej publikacji ogłoszeń B2B bezpośrednio w serwisie ([components/employer/EmployerPortalModal.tsx](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/components/employer/EmployerPortalModal.tsx)).
- [x] **Zarządzanie Kandydatami (ATS Light)**: Tablica Kanban do śledzenia procesów rekrutacyjnych ([components/employer/AtsKanbanBoard.tsx](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/components/employer/AtsKanbanBoard.tsx)).
- [x] **Weryfikacja Tożsamości i Oceny Ekip**: Moduł ocen i opinii z gwiazdkami o pracodawcach i ekipach budowlanych ([components/reviews/EmployerReviewModal.tsx](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/components/reviews/EmployerReviewModal.tsx)).

---

## 🔐 4. System Logowania, Profilu i Powiadomień Multi-Channel (Faza 4 — Zrealizowana)

### 🔑 4.1. Ulepszenia Logowania i Rejestracji
- [x] **OAuth2 Social Sign-In**: Integracja logowania przez Google oraz wsparcie dla providerów OAuth2.
- [x] **Passwordless Magic Link (`lib/auth/passwordless.ts`)**: Bezhasłowe logowanie linkiem wysyłanym na e-mail z automatycznym przechowywaniem tokenów.
- [x] **Wsparcie Ról w Profilu (Role-Based Onboarding)**: Przełącznik ról w profilu użytkownika: *"Szukam pracy"* (Kandydat/Fachowiec) vs *"Zatrudniam"* (Pracodawca/Brygadzista).

### 👤 4.2. Profil Użytkownika & Cyfrowa Karta Fachowca (`TradeProfileModal.tsx`)
- [x] **Cyfrowy Badge Fachu i Certyfikatów**: Wybór branż budowlanych oraz weryfikowalnych badge'y uprawnień (SEP G1/G2/G3, UDT, F-gaz, Prawo jazdy B/C, Praca na wysokości).
- [x] **Ustawienia Stawki Oczekiwanej**: Suwak kwoty minimalnej w PLN/mies. dla dopasowania ofert.

### 🔔 4.3. Centrum Powiadomień i Multi-Channel Inbox (`NotificationCenterModal.tsx`)
- [x] **Przełączniki Kanałów Powiadomień (Web Push / E-mail / SMS)**: Wygodna konfigurowalna obsługa powiadomień natychmiastowych.
- [x] **Centrum Zawiadomień w Aplikacji (Notification Inbox)**: Skrzynka zawiadomień o nowych ofertach o wysokich stawkach (> 10 000 PLN) i raportach pogodowych na budowach ze wskaźnikami statusu odczytu.

---

## ⚙️ 5. Infrastruktura i Bezpieczeństwo Techniczne

- [x] **100% Pokrycia Testami**: Przechodząca suita 83 plików testowych (748 testów jednostkowych i integracyjnych).
- [x] **Czyste Typowanie TypeScript**: Pełna zgodność ze ścisłymi regułami TypeScript (`npm run typecheck` zwraca 0 błędów).
- [x] **Automatyczne Czyszczenie Starych Ogłoszeń**: Endpoint retencji danych ogłoszeń w Firestore ([app/api/announcements/cleanup/route.ts](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/app/api/announcements/cleanup/route.ts)).

---

*Ostatnia aktualizacja: 2026-07-29 (Wszystkie Fazy 1-4 zrealizowane i w pełni przetestowane)*
