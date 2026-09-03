# 🏗️ PLAN ARCHITEKTONICZNY SYSTEMU NAETACIE.PL
## Lead Senior Systems & GIS Architect Blueprint
**Wersja:** 3.0 Enterprise • **Data:** Marzec 2026 • **Status:** Approved / In Production

---

## 🧭 SPIS TREŚCI
1. [Wstęp i Diagnoza Bieżącego Stanu](#1-wstęp-i-diagnoza-bieżącego-stanu)
2. [Plan Rozbudowy Systemu Scrapowania i Ekstrakcji Danych (Scraper 3.0)](#2-plan-rozbudowy-systemu-scrapowania-i-ekstrakcji-danych-scraper-30)
3. [Architektura Mapy 3D na Wzór Google Maps (100% Darmowa)](#3-architektura-mapy-3d-na-wzór-google-maps-100-darmowa)
4. [Kompleksowa Analiza UI/UX: Układ, Typografia i Kolory](#4-kompleksowa-analiza-uiux-układ-typografia-i-kolory)
5. [Harmonogram Wdrożenia (Roadmapa Krok po Kroku)](#5-harmonogram-wdrożenia-roadmapa-krok-po-kroku)

---

## 1. Wstęp i Diagnoza Bieżącego Stanu

Projekt **NaEtacie.pl** to specjalistyczna platforma pracy budowlano-remontowej dla aglomeracji szczecińskiej. W toku weryfikacji produkcyjnej zdiagnozowano i wyeliminowano następujące wąskie gardła:

### ⚠️ Zidentyfikowane Problemy:
1. **OLX – puste lub błędne oferty**:
   - Scrapowanie OLX korzystało wyłącznie z filtra `region_id=11` (woj. zachodniopomorskie), co ściągało oferty oddalone o 150 km (Koszalin, Kołobrzeg, Świnoujście, Wałcz) oraz oferty sponsorowane z całej Polski (Warszawa, Niemcy).
   - Gdy filtr miejski `isSzczecinAnnouncement` odrzucał oferty spoza Szczecina, użytkownik widział pusty ekran (`0 ofert`).
   - Dynamiczne klasy CSS OLX (`.css-xxxx { ... }`) przenikały do tytułów i opisów ofert jako śmieciowy kod tekstowy.
2. **Mapa "wariująca" przy kliknięciach**:
   - **Kolizja klastrów WebGL z markerami DOM**: Silnik MapLibre renderował jednocześnie wektorowe koła klastrów (`jobs-cluster-source`) ORAZ 50 markerów HTML DOM dla tych samych współrzędnych. Skutkowało to podwójnym nakładaniem się elementów i skakaniem pinezek przy zoomie.
   - **Brak popupu po kliknięciu**: Kliknięcie markera zmieniało jedynie stan `selectedId`, nie wywołując `openPopup()`.
   - **Dublowanie modali**: Jednoczesne otwieranie okna `DraggableJobModal` na środku ekranu i popupu na mapie powodowało chaos wizualny.

### ✅ Wdrożone Natychmiastowe Poprawki:
- **OLX Precyzyjny**: Dodano `city_id=8959` (oficjalne ID Szczecina w API OLX), czyszczenie kodu `.css` oraz automatyczny fallback geokodowania do 37 osiedli Szczecina.
- **Jednolity System Markerów i Popupów**: Kliknięcie dowolnej pinezki natychmiast płynnie centruje mapę i otwiera elegancką kartę informacyjną w stylu Google Maps (kategoria, stawka, telefon, dojazd, Street View).
- **Sterowanie Google Maps**: Dodano trójwymiarowy kompas (reset rotacji/nachylenia) i przyciski zoomu w prawym dolnym rogu.

---

## 2. Plan Rozbudowy Systemu Scrapowania i Ekstrakcji Danych (Scraper 3.0)

Aby zapewnić **100% świeżości, zero pustych ofert i brak banów IP**, architektura ekstrakcji zostaje podzielona na 4 niezależne, redundantne warstwy:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ORKIESTRATOR POBIERANIA (ENGINE 3.0)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│  WARSTWA 1   │             │  WARSTWA 2   │             │  WARSTWA 3   │
│ Direct REST  │             │ SSR Hydrate  │             │ Playwright   │
│  Mobile API  │             │ JSON-LD & DOM│             │ Headless Bot │
│  (Sub-second)│             │ (No-JS Fall) │             │ (Stealth TLS)│
└──────┬───────┘             └──────┬───────┘             └──────┬───────┘
       │                            │                            │
       └────────────────────────────┼────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               FILTR PRZESTRZENNY & CZYSZCZENIE DANYCH                  │
│  - Szczecin Metro Boundaries (53.30–53.65 N, 14.40–14.75 E)           │
│  - Regex / NLP Stripper (usunięcie .css-*, tagów HTML, emotek śmieci)  │
│  - Konwersja Stawek: /h -> /miesięcznie, Brutto <-> Netto              │
│  - Geokodowanie mikrodzielnic (37 oficjalnych osiedli Szczecina)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             FUZZY DEDUPLICATION & PERSYSTENCJA (FIRESTORE)             │
│  - Klucz deduplikacji: [portal]-[clean_id]                            │
│  - Cross-portal Levenshtein matching (OLX vs Pracuj vs Indeed)         │
│  - TTL Invalidation: Ogłoszenia nieaktywne oznaczane po 7 dniach       │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Warstwa 1: Bezpośrednie API Mobilne i Lekkie Zapytania REST
* **OLX API v1**: Wywołania z parametrami `city_id=8959`, `region_id=11`, `category_id=4` (Praca) oraz `sort_by=created_at:desc`.
* **Pracuj.pl API Search**: Zapytania JSON z nagłówkami aplikacji mobilnej (`User-Agent: PracujMobile/5.x Android`), omijające weryfikację Cloudflare.
* **Oferteo & Fixly**: Pobieranie zleceń budowlanych przez Firecrawl / dedykowane parsery zapytań publicznych.

### 2.2. Ochrona Anty-Botowa (Stealth Defense Shield)
* **Rotacja TLS Fingerprint**: Wykorzystanie `undici.Agent` z nagłówkami naśladującymi przeglądarkę Chrome 128+ na systemie Windows 11.
* **Randomizowane Odstępy (Jitter)**: Zapytania wysyłane z interwałem losowym $1500\text{ ms} - 4200\text{ ms}$.
* **Circuit Breaker (Bezpiecznik)**: W przypadku odebrania 3 błędów HTTP 403 / 429 portal przechodzi w stan `OPEN` (pauza na 5 minut), serwując dane z pamięci podręcznej / bazy Firestore.

### 2.3. Rygorystyczny Rurociąg Walidacji i Geokodowania
* **Bariera Geograficzna Aglomeracji Szczecińskiej**:
  Każde ogłoszenie musi należeć do Szczecina lub gmin ościennych: *Police, Mierzyn, Przecław, Bezrzecze, Dobra, Kołbaskowo, Warzymice, Wołczkowo, Gryfino, Stargard, Goleniów*. Wszelkie oferty z Koszalina, Warszawy czy Niemiec są natychmiast odrzucane.
* **Geokodowanie Mikrodzielnicowe**:
  W przypadku braku współrzędnych GPS w ofercie, algorytm przeszukuje treść pod kątem 37 osiedli (np. *Gumieńce, Niebuszewo, Pogodno, Warszewo, Słoneczne, Dąbie*) i przypisuje oficjalne współrzędne centroidu z katalogu `szczecinMicroDistricts.ts`.

---

## 3. Architektura Mapy 3D na Wzór Google Maps (100% Darmowa)

Celem jest osiągnięcie **jakości i płynności Google Maps / Mapbox 3D bez jakichkolwiek opłat licencyjnych** (0 zł za zapytania do kafelków).

### 3.1. Stos Technologiczny Mapy
* **Silnik Renderujący**: `MapLibre GL JS v4` (W pełni otwartoźródłowy fork Mapbox GL, wykorzystujący WebGL2 i sprzętową akcelerację GPU).
* **Darmowe Kafelki Wektorowe (Vector Tiles)**:
  - **Domyślny (Styl Google Maps / Voyager)**: `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json`
  - **Tryb Nocny (Dark Matter Cyberpunk)**: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`
  - **Tryb Satelitarny**: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` (Darmowa ortofotomapa satelitarna wysokiej rozdzielczości od ESRI/ArcGIS).

### 3.2. Funkcje 3D i Cyfrowy Bliźniak Szczecina
1. **Ekstruzja Budynków 3D (`fill-extrusion`)**:
   - Automatyczne wyciąganie brył budynków na podstawie warstwy `building` przy powiększeniu $\ge 15$.
   - Wysokość budynków interpolowana dynamicznie na podstawie tagów OpenStreetMap (`render_height`).
2. **Symulator Oświetlenia Słońca (Sunlight Engine)**:
   - Dynamiczne cieniowanie brył budynków w zależności od aktualnej godziny w Szczecinie (światło złote o zachodzie 17:00–20:00, chłodne światło dzienne, nocne oświetlenie neonowe).
3. **Kluczowe Punkty Orientacyjne 3D**:
   - Predefiniowane kamery widokowe: *Panorama Wałów Chrobrego & Łasztowni*, *Centrum Plac Rodła*, *Stadion Miejski Pogoni Szczecin*.

### 3.3. Ergonomia Interakcji (Wzór Google Maps)
* **Płynna Przemiana Klastrów w Pinezki**:
  - Zoom $< 12$: Przejrzyste bąbelki klastrów z sumą ofert w danej dzielnicy (brak zacinania ekranu).
  - Zoom $\ge 12$: Płynne rozsunięcie klastrów w indywidualne pinezki z czytelną stawką godzinową/miesięczną.
  - W przypadku ofert o tym samym adresie: automatyczny algorytm **Spiderfy** (promieniste odnogi).
* **Karta Informacyjna (Google Maps Style InfoWindow)**:
  - Kotwiczona bezpośrednio nad klikniętym markerem.
  - Zawiera: Logo branży, Stawkę (wyróżnioną na zielono), Dzielnicę, Czas dojazdu z domu użytkownika, bezpośredni przycisk połączenia telefonicznego, trasę nawigacji oraz podgląd Google Street View.

---

## 4. Kompleksowa Analiza UI/UX: Układ, Typografia i Kolory

### 4.1. Układ Ekranu i Architektura Przestrzenna (Layout)

Aplikacja dla branży budowlanej musi być obsługiwana **jedną ręką na budowie w rękawicach roboczych lub w pełnym słońcu**.

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER (56px): [Logo NaEtacie] [Szukajka ⌘K] [Licznik Ofert] [Menu ☰]  │
├────────────────────────────────────────────────────────────────────────┤
│ MAPA 3D (Pełnoekranowy Canvas WebGL)                                   │
│                                                                        │
│ ┌──────────────────────┐                     ┌───────────────────────┐ │
│ │ 🗺️ Narzędzia & Warstwy│                     │ ☀️ Pogoda dla Budowy  │ │
│ │ (Pływający Panel     │                     │    14°C • Wiatr 12km/h│ │
│ │  Szerokość: 260px)   │                     └───────────────────────┘ │
│ └──────────────────────┘                                               │
│                                                                        │
│                          📍 [Karta Oferty]                             │
│                             (Nad pinezką)                              │
│                                                                        │
│                                              ┌───────────────────────┐ │
│                                              │ 🧭 Kompas 3D (Obrót)  │ │
│                                              │ ➕ Zoom In             │ │
│                                              │ ➖ Zoom Out            │ │
│                                              │ ⛶ Pełny Ekran         │ │
│                                              └───────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ MOBILE BOTTOM SHEET / DESKTOP CAROUSEL (Dolny pasek ofert)             │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.2. Typografia (Typography System)

* **Krój Podstawowy**: `Plus Jakarta Sans` / `Inter` (Zmienna szerokość, doskonała czytelność znaków przy małym rozmiarze).
* **Cyfry Tabularyczne (`tabular-nums` / `font-mono`)**:
  - Wszystkie stawki (np. `45–60 zł/h`, `8 500 zł`) oraz odległości (`2.4 km`) muszą posiadać stałą szerokość cyfr. Zapobiega to drganiu tekstu podczas dynamicznego filtrowania.
* **Hierarchia Wielkości**:
  - Tytuł oferty: `14px / font-black` (Pogrubiony, zwięzły, obcięty do 2 linii).
  - Stawka wynagrodzenia: `15px / font-extrabold / text-emerald-400` (Najważniejszy element dla fachowca).
  - Metadane (dzielnica, data, portal): `11px / font-semibold / text-zinc-400`.

### 4.3. System Kolorystyczny i Kontrast (WCAG 2.1 AAA)

Interfejs zoptymalizowano pod kątem maksymalnej czytelności na ekranach OLED i w ostrym świetle dziennym:

| Rola Elementu | Kolor HEX | Znaczenie Psychologiczne & Zastosowanie |
| :--- | :--- | :--- |
| **Główne Tło (Surface)** | `#09090b` (Zinc 950) | Głęboka czerń, oszczędność baterii OLED, brak refleksów |
| **Pływające Panele** | `rgba(9, 9, 11, 0.92)` | Szkło akrylowe z rozmyciem `backdrop-blur-2xl` |
| **Akcent Pieniądza** | `#10b981` (Emerald 500) | Potwierdzone zarobki, wysokie stawki, aktywny status |
| **Ostrzeżenia i Pilne** | `#f59e0b` (Amber 500) | Oferty na już ("Od zaraz"), alerty pogodowe dla betonu |
| **Komunikacja ZTM** | `#3b82f6` (Blue 500) | Przystanki tramwajowe/autobusowe, czasy dojazdu |
| **Duma Pomorza** | `#4f46e5` / `#991b1b` | Granatowo-bordowe akcenty Pogoni Szczecin |
| **Tekst Podstawowy** | `#f4f4f5` (Zinc 100) | Maksymalny kontrast 16:1 (spełnia normę WCAG AAA) |

---

## 5. Harmonogram Wdrożenia (Roadmapa Krok po Kroku)

### Etap 1: Stabilizacja Produkcyjna (Wdrożone)
- [x] Naprawa wywołania API OLX z `city_id=8959`.
- [x] Unifikacja kliknięć w pinezki na mapie – dodanie `openPopup()`.
- [x] Wdrożenie kompasu trójwymiarowego i kontrolek zoomu w stylu Google Maps.
- [x] Nowy, ergonomiczny panel *Narzędzia i Warstwy* (szerokość 260px, czytelny podział).
- [x] Poprawki typowania TypeScript i pomyślna kompilacja produkcyjna `next build` (kod 0).

### Etap 2: Autonomiczny Cron & Healthcheck (Wdrożone)
- [x] Konfiguracja darmowego Vercel Cron (`0 6 * * *`) odpytującego `/api/cron/scrape` z automatycznym łańcuchem czyszczenia stale listings.
- [x] Reużywalny serwis Tombstone Sweep (`lib/verification/tombstoneSweep.ts`) wykrywający 404, wygaśnięcia HTTP oraz oferty starsze niż 30 dni.
- [x] Kompletna baza wszystkich 37 oficjalnych osiedli miejskich Szczecina ze wsparciem polskich znaków w dopasowywaniu granic słów (`szczecinMicroDistricts.ts`).
- [x] Wdrożenie nowych megaprojektów budowlanych (Łasztownia, Szpital Kliniczny PUM Pomorzany, Warszewo-Północ Podbórzańska w `szczecinMegaProjects.ts`).
- [x] Dedykowany endpoint telemetryczny `/api/health` raportujący stan systemów i geokatalogu dla zewnętrznych monitorów uptime.

### Etap 3: Zaawansowany GIS Offline
- [ ] Zapisywanie wektorowych kafelków obszaru Szczecina w `IndexedDB` (Service Worker PWA).
- [ ] Dostęp do mapy i zapisanych ofert w trybie offline w wykopach budowlanych i piwnicach bez zasięgu GSM.

---
*Dokument zatwierdzony przez Architekta Systemowego NaEtacie.pl.*
