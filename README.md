# 🌿 Na Etacie Szczecin — Inteligentna Platforma Ofert Pracy z Mapą Przestrzenną

![Zieleń Szmaragdowa](https://img.shields.io/badge/Theme-Emerald%20Green-10b981?style=for-the-badge)
![Next.js 14](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript)
![MapLibre GL JS](https://img.shields.io/badge/MapLibre_GL-WebGL-blue?style=for-the-badge)
![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge)

**Na Etacie Szczecin** to nowoczesna, wysoce responsywna platforma internetowa i aplikacja PWA dedykowana dla poszukujących pracy w **Szczecinie oraz Aglomeracji Szczecińskiej**. Łączy zalety błyskawicznego wyszukiwania tekstowego, zaawansowanego silnika dopasowania ofert oraz interaktywnej wizualizacji przestrzennej na mapie WebGL w domyślnym, lśniącym motywie **Zielenik Szmaragdowej (Emerald Nature)**.

---

## 🌿 Domyślny Motyw: Zieleń Szmaragdowa (Emerald Nature)

Platforma domyślnie wykorzystuje motyw **Zielenik Szmaragdowej** (`#10b981` / `hsl(160, 84%, 39%)`), inspierowany zielenią parków, Puszczy Bukowej i rzeki Odry w Szczecinie:
* **Mapa WebGL:** Podkładem mapy jest soczysty, przestrzenny motyw **CartoDB Voyager Emerald**, eksponujący tereny zielone, rekreacyjne oraz siatkę dróg Szczecina.
* **Akcenty UI:** Przycisk akcji, pigułki stawek płacowych, podświetlenia klastrów oraz przełączniki zostały zintegrowane w harmonijnej palecie szmaragdowej.
* **Możliwość Zmiany:** Użytkownik w każdej chwili może przełączyć podkład mapy w menu stylów (`🗺️`) na motyw **Ciemny (Dark Matter)** lub **Jasny (Positron)**.

---

## 🚀 Kluczowe Moduły & Funkcje Enterprise

### 1. 🗺️ Interaktywna Mapa Przestrzenna Szczecina (`MapView.tsx`)
* **Klastrowanie i Rozwijanie (WebGL Clustering & Spiderfy):** Punktowe i klastrowe prezentowanie ofert pracy. Przy nakładających się ogłoszeniach pod jednym adresem stosuje automatyczny algorytm spiralny (Spiderfy).
* **Rygorystyczny Filtr Szczecina (`isSzczecinAnnouncement`):** Mapa ogranicza prezentowane ogłoszenia wyłącznie do granic Szczecina i okolicznych gmin aglomeracji.
* **Rysowanie Obszaru (Lasso / Custom Polygon Search):** Możliwość swobodnego narysowania myszką lub palcem dowolnego kształtu na mapie i odfiltrowania ogłoszeń wyłącznie z tego obszaru.
* **Strefy Czasu Dojazdu (Isochrone Commute Zones):** Generowanie nieregularnych poligonów dojazdu samochodowego, rowerowego lub pieszego w czasie 10, 20 lub 30 minut.
* **Analityka Stawek w Dzielnicach (District Analytics):** Nakładki ze średnimi stawkami brutto oraz liczbą wakatów na dzielnice Szczecina (*Centrum, Pogodno, Prawobrzeże, Gumieńce...*).
* **Geofencing & Geo-Alerty:** Tworzenie i zapisywanie stref powiadomień o promieniu 1–25 km wokół wybranego adresu domowego.
* **Widok Ulicy (Street View):** Szybki odnośnik do 360-stopniowych zdjęć sferycznych Google Street View w miejscu pracy.

### 2. 📜 Nowoczesna Lista Ogłoszeń z Kinematycznym Podglądem
* **Kinematyczny Podgląd Drawer (`KinematicQuickView.tsx`):** Kliknięcie w dowolne ogłoszenie wysuwa kinowy panel boczny z rozbiciem stawek netto, pełnym opisem i opcją szybkiego połączenia telefonicznego.
* **3D Mouse Tilt & Glass Pills:** Karty reagują na ruch myszki subtelnym trójwymiarowym nachyleniem, a stawki prezentowane są w postaci lśniących pigułek szklanych.
* **Puls Rynku (`MarketPulseBar.tsx`):** Pasek powiadomień w czasie rzeczywistym informujący o średniej i najwyższej stawce w Szczecinie.
* **Gest Przesunięcia (Swipe Card):** Na urządzeniach mobilnych przesunięcie karty w prawo dodaje ją do ulubionych, a w lewo zmienia status aplikacji ze wsparciem dla haptiki (`vibrate`).

### 3. 💰 Kalkulator Wynagrodzeń Netto/Brutto (`SalaryNetModal.tsx`)
* Automatyczne przeliczanie oferowanej kwoty brutto na kwoty "na rękę" dla:
  * **Umowy o Pracę (UoP)**,
  * **Umowy Zlecenie (UZ)**,
  * **UZ dla Uczniów/Studentów (&lt;26 lat)** (100% brutto),
  * **Samozatrudnienia B2B** (szacunek na czysto po opłaceniu ZUS i ryczałtu).

### 4. ⚖️ Porównywarka Ofert Pracy (`JobComparisonModal.tsx`)
* Dodawanie do 3 interesujących ofert do czytelnej tabeli porównawczej (wynagrodzenia netto/brutto, forma umowy, lokalizacja, portal źródłowy).

### 5. ⌨️ Klawiaturowa Paleta Komend (`CommandPaletteModal.tsx`)
* Skrót `Ctrl + K` / `Cmd + K` otwiera szybką paletę przeszukiwania i nawigacji bez odrywania rąk od klawiatury.

### 6. 📱 Aplikacja PWA & Integracja z ZDiTM
* Proaktywny banner instalacji PWA na telefonie (`PwaInstallPrompt.tsx`).
* Przycisk **`🚌 Dojazd ZDiTM`** prowadzący prosto do nawigacji autobusowo-tramwajowej Szczecina.

### 7. 🔤 Dostępność WCAG AAA & Raporty CSV
* Dedykowane skalowanie rozmiaru tekstu (**A / A+ / A++**) w ustawieniach profilu.
* Generowanie i pobieranie pełnego raportu zaaplikowanych ofert do pliku `.csv` dla potrzeb Urzędu Pracy lub rejestru własnego.

---

## 🛠️ Architektura Techniczna i Tech Stack

| Warstwa | Technologia / Biblioteka |
| :--- | :--- |
| **Framework** | Next.js 14 (App Router, React 18, Server Actions) |
| **Język** | TypeScript 5.0 (Strict mode) |
| **Stylizowanie** | Tailwind CSS v4, CSS Custom Properties, Glassmorphism |
| **Mapy & WebGL** | MapLibre GL JS, CartoDB Vector Tiles CDN |
| **Animacje** | Framer Motion (Gestures, Spring Physics, AnimatePresence) |
| **Baza i Auth** | Firebase Authentication, Cloud Firestore |
| **Testy** | Vitest (Property-based tests, Unit tests, Integration tests) |
| **Ikony** | Lucide React |

---

## 🧪 Uruchamianie i Weryfikacja Projekty

### Instalacja Zależności
```bash
npm install
```

### Uruchomienie Serwera Deweloperskiego
```bash
npm run dev
```
Aplikacja dostępna pod adresem: `http://localhost:3000`

### Weryfikacja Typów TypeScript
```bash
npm run typecheck
```

### Uruchomienie Pakietu Testów (Vitest)
```bash
npm test
```

---

## 📁 Struktura Katalogów

```
├── app/
│   ├── api/             # Endpoints REST / scrapowanie ogłoszeń
│   ├── globals.css      # Design system, zmienne kolorów Szmaragdu
│   ├── layout.tsx       # Główny szablon HTML & PWA Meta
│   └── page.tsx         # Główny widok Split-Screen (Lista + Mapa)
├── components/
│   ├── compare/         # Porównywarka ofert (JobComparisonModal)
│   ├── list/            # Komponenty listy (AnnouncementCard, KinematicQuickView, MarketPulseBar)
│   ├── map/             # Komponenty mapy (MapView, MapLassoDraw, MapIsochrone, MapGeoAlert)
│   ├── navigation/      # Paleta Komend (CommandPaletteModal), Nawigacja
│   ├── profile/         # Ustawienia, motywy i eksport CSV (ProfileSettings, ThemeToggle)
│   ├── pwa/             # Banner PWA (PwaInstallPrompt)
│   └── salary/          # Kalkulator Wynagrodzeń (SalaryNetModal)
├── lib/
│   ├── audio/           # Syntetyczne dźwięki Web Audio API (chime.ts)
│   ├── matching/        # Silnik wyliczania dopasowania ogłoszeń
│   ├── salary/          # Przelicznik brutto-netto (calculator.ts)
│   └── search/          # Silnik wyszukiwania i filtr Szczecina (engine.ts)
└── tests/               # Testy integracyjne i reguły bezpieczeństwa
```

---

*Wytworzono dla Szczecina z wykorzystaniem najnowocześniejszych standardów webowych.*
