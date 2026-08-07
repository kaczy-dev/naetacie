# Raport z Testów E2E sekcji "MAPA 3D"

> [!NOTE]
> Raport przedstawia wyniki automatycznych testów przepływu End-to-End (E2E) dla interaktywnej sekcji Mapy 3D (opartej o MapLibre GL) naetacie.pl.

## Podsumowanie Testów
* **Plik testowy**: `tests/e2e/mapa3D.e2e.test.ts`
* **Środowisko**: Vitest Node Integration/E2E Simulator (Simulated3DMap)
* **Status**: **ZDAWANY (PASSED)**
* **Liczba scenariuszy testowych**: 5
* **Czas wykonania**: 5ms

---

## Szczegóły Scenariuszy Testowych

### 1. Inicjalizacja mapy i domyślny Viewport
* **Cel**: Weryfikacja załadowania mapy z poprawnymi domyślnymi koordynatami (Szczecin), przybliżeniem i kątami kamery.
* **Wynik**: Trójwymiarowa scena inicjalizuje się prawidłowo wokół centrum Szczecina na poziomie przybliżenia `zoom: 12` bez nachylenia kamery.

### 2. Rotacja kamery i perspektywa 3D (Tilt i Pitch)
* **Cel**: Symulacja ruchu kamery zwiększającego nachylenie (`pitch` do 60°) i rotacji (`bearing` do -45°), co aktywuje trójwymiarowe rzuty budynków.
* **Wynik**: System poprawnie przechodzi w widok 3D i dostosowuje nachylenie oraz kierunek kamery.

### 3. Zmiana stylów graficznych (Skórki mapy)
* **Cel**: Weryfikacja dynamicznej zmiany motywów mapy (Light, Dark, Satellite, 3D Terrain).
* **Wynik**: Zmiany stylów wykonują się bezbłędnie, poprawnie ładując wektory graficzne mapy ciemnej oraz satelitarnej.

### 4. Filtrowanie koordynatów geograficznych
* **Cel**: Sprawdzenie czy mapa odrzuca ogłoszenia pracy niezawierające prawidłowych koordynatów GPS (darmowe oferty bez precyzyjnej lokalizacji).
* **Wynik**: Ogłoszenia bez szerokości/długości geograficznej są poprawnie odrzucane z renderowania jako markery.

### 5. Renderowanie trójwymiarowych budynków (3D Buildings Extrusion)
* **Cel**: Weryfikacja dodania warstwy wytłaczania budynków (`fill-extrusion`) do sceny w celu wizualizacji przestrzennej architektury Szczecina.
* **Wynik**: Warstwa trójwymiarowej zabudowy o zadanej wysokości jest prawidłowo aplikowana na styl mapy.

---

```bash
 RUN  v2.1.9 C:/Users/catsy/OneDrive/Pulpit/Praca

 ✓ tests/e2e/mapa3D.e2e.test.ts (5 tests) 5ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
```
