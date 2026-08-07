# Raport z Testów E2E sekcji "LISTA OFERT"

> [!NOTE]
> Raport przedstawia wyniki automatycznych testów przepływu End-to-End (E2E) dla sekcji listy ofert pracy agregatora naetacie.pl.

## Podsumowanie Testów
* **Plik testowy**: `tests/e2e/listaOfert.e2e.test.ts`
* **Środowisko**: Vitest Node Integration/E2E Simulator
* **Status**: **ZDAWANY (PASSED)**
* **Liczba scenariuszy testowych**: 6
* **Czas wykonania**: 9ms

---

## Szczegóły Scenariuszy Testowych

### 1. Pobieranie ogłoszeń (Initial Fetch)
* **Cel**: Symulacja ładowania ofert przez interfejs użytkownika z bazy danych lub cache.
* **Wynik**: Test potwierdził poprawne pobranie pakietu danych demonstracyjnych (SEED_DATA) zawierających kluczowe atrybuty (tytuł, portal źródłowy, stawka, opis).

### 2. Filtrowanie portali źródłowych
* **Cel**: Weryfikacja filtrowania ogłoszeń pod kątem portalu źródłowego (OLX, Pracuj.pl, Indeed).
* **Wynik**: System poprawnie rozdziela ogłoszenia na poszczególne kanały dystrybucji bez utraty danych (suma ofert cząstkowych jest równa liczbie wszystkich ogłoszeń).

### 3. Wyszukiwanie z tolerancją diakrytyków
* **Cel**: Sprawdzenie czy wyszukiwarka ignoruje polskie znaki diakrytyczne (np. wpisanie "murarz" lub "mórarz").
* **Wynik**: Wyszukiwarka wyszukuje oferty poprawnie dla zapytań z diakrytykami i bez nich.

### 4. Sortowanie chronologiczne
* **Cel**: Sprawdzenie sortowania listy ofert od najnowszych do najstarszych (data pobrania `scraped_at`).
* **Wynik**: Wyniki są poprawnie układane chronologicznie w dół (najnowsze pobrane oferty na samej górze).

### 5. Maskowanie danych na poziomie planu (Tier Masking)
* **Cel**: Weryfikacja zachowania paywalla i ograniczeń dla użytkowników planu Free vs Premium.
* **Wynik**:
  * **Free Tier**: Opisy dłuższe niż 100 znaków są przycinane i kończą się wielokropkiem (`...`), a pola `source_url` i `contact_info` są niewidoczne (blokada Premium).
  * **Premium Tier**: Wszystkie dane kontaktowe i bezpośrednie linki źródłowe są w pełni widoczne.

### 6. Paginacja i metadane
* **Cel**: Weryfikacja obliczania metadanych paginacji (liczba stron, rozmiar strony, następna strona).
* **Wynik**: Parametry paginacji kalkulują się poprawnie, umożliwiając prawidłowe dzielenie wyników na podstrony na frontendzie.

---

```bash
 RUN  v2.1.9 C:/Users/catsy/OneDrive/Pulpit/Praca

 ✓ tests/e2e/listaOfert.e2e.test.ts (6 tests) 9ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
```
