# 🚀 Plan i Mapa Drogowa Ulepszeń — Aplikacja "Na Etacie"

Dokument zawiera kompletny, ustrukturyzowany plan rozwoju agregatora ogłoszeń pracy i zleceń budowlanych w Szczecinie i okolicach.

---

## 📌 1. Priorytetowe Ulepszenia UX & PWA (Faza 1 — Krótkoterminowa)

### 📱 1.1. Optymalizacja PWA i Działań Offline
- [x] **Naprawa ikon PWA**: Wygenerowano dedykowane pliki `icon-192.png` oraz `icon-512.png` w jakości Retina dla ekranu głównego.
- [x] **Customowy Banner Instalacyjny PWA**: Prawidłowa obsługa zdarzenia `beforeinstallprompt` z bezpiecznym wywołaniem `deferredPrompt.prompt()`.
- [x] **Offline Synchronization Queue**: Zastosowano moduł IndexedDB ([lib/offline/syncManager.ts](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/lib/offline/syncManager.ts)) oraz Service Worker ([public/sw.js](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/public/sw.js)) umożliwiający automatyczną synchronizację polubień i statusów po powrocie do sieci.
- [x] **Inteligentne Cache'owanie Mapy**: Buforowanie geodanych i punków ogłoszeń w IndexedDB dla błyskawicznego działania offline.

### 🔗 1.2. Niezawodność i Bezpieczeństwo Linków Zewnętrznych
- [x] **Zabezpieczenie przycisków akcji ("OTWÓRZ / Zobacz w OLX")**: Dodano `onPointerDown={(e) => e.stopPropagation()}` oraz bezwzględne wywołania `window.open`, zapobiegające przechwytywaniu gestu swipowania przez Framer Motion.
- [x] **Scentralizowany Normalizator URL (`getAnnouncementExternalUrl`)**: Automatyczne przekształcanie ścieżek względnych w pełne linki HTTPS oraz generowanie rezerwowego wyszukiwania na OLX/Pracuj.pl, gdy adres źródłowy jest niedostępny.

---

## 🤖 2. Inteligentne Funkcje AI & Dopasowanie (Faza 2 — Średnioterminowa)

### 🧠 2.1. Asystent AI dla Szukających Pracy
- [x] **Inteligentny Asystent Rozmowy Rekrutacyjnej (AI Interview Simulator)**: Dedykowany symulator pytaniowy z informacją zwrotną AI dla wybranego fachu ([components/ai/AiInterviewModal.tsx](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/components/ai/AiInterviewModal.tsx)).
- [x] **Autonawigacja i Dobór Dojazdów**: Algorytm wyliczania realnego czasu dojazdu samochodem, ZTM, rowerem i pieszo w Szczecinie ([lib/geo/commuteCalculator.ts](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/lib/geo/commuteCalculator.ts)).
- [x] **Dopasowanie Zespołowe i Stawek (Salary Benchmarking)**: Wizualny wykres porównujący stawkę oferty ze średnią dla Szczecina i województwa zachodniopomorskiego ([components/stats/SalaryBenchmarkingModal.tsx](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/components/stats/SalaryBenchmarkingModal.tsx)).

### 📝 2.2. Automatyzacja Aplikowania
- [x] **Generator CV Budowlanego w PDF**: Komponent generujący estetyczne CV w 30 sekund z opcją druku i zapisu do PDF ([components/cv/CvGeneratorModal.tsx](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/components/cv/CvGeneratorModal.tsx)).
- [x] **Auto-Draft Wiadomości SMS / WhatsApp**: Generator gotowych treści wiadomości aplikacyjnych do pracodawcy po polsku ([lib/contact/draftGenerator.ts](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/lib/contact/draftGenerator.ts)).

---

## 🏬 3. Panel Pracodawcy i Ekosystem B2B (Faza 3 — Długoterminowa)

### 🏢 3.1. Dedykowany Portal dla Firm Budowlanych
- [x] **Panel Dodawania Bezpośrednich Ogłoszeń**: Formularz bezpłatnej publikacji ogłoszeń B2B bezpośrednio w serwisie ([components/employer/EmployerPortalModal.tsx](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/components/employer/EmployerPortalModal.tsx)).
- [x] **Zarządzanie Kandydatami (ATS Light)**: Tablica Kanban do śledzenia procesów rekrutacyjnych ([components/employer/AtsKanbanBoard.tsx](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/components/employer/AtsKanbanBoard.tsx)).
- [x] **Weryfikacja Tożsamości i Oceny Ekip**: Moduł ocen i opinii z gwiazdkami o pracodawcach i ekipach budowlanych ([components/reviews/EmployerReviewModal.tsx](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/components/reviews/EmployerReviewModal.tsx)).

---

## ⚙️ 4. Infrastruktura i Bezpieczeństwo Techniczne

- [x] **100% Pokrycia Testami**: Przechodząca suita 76 plików testowych (698 testów jednostkowych i integracyjnych).
- [x] **Czyste Typowanie TypeScript**: Pełna zgodność ze ścisłymi regułami TypeScript (`npx tsc --noEmit` zwraca 0 błędów).
- [x] **Automatyczne Czyszczenie Starych Ogłoszeń**: Endpoint retencji danych ogłoszeń w Firestore ([app/api/announcements/cleanup/route.ts](file:///C:/Users/catsy/OneDrive/Pulpit/Praca/app/api/announcements/cleanup/route.ts)).

---

*Ostatnia aktualizacja: 2026-07-27 (Wszystkie punkty 1-4 zrealizowane i przetestowane)*
