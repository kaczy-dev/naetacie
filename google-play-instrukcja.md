# ?? Publikacja NaEtacie w Google Play Store (TWA / Bubblewrap)

Kompletny przewodnik wdro¿enia aplikacji NaEtacie do Google Play w architekturze Trusted Web Activity (TWA).

---

## 1. Wymagania wstêpne
- **Node.js**: Zainstalowany (posiadasz wersjê zgodn¹)
- **Java JDK (v17 lub v21)**: Wymagana do budowania pakietów Android (.aab)
- **Konto Google Play Console**: Jednorazowa op³ata rejestracyjna u Google ($25)

---

## 2. Gotowe pliki konfiguracyjne w projekcie
1. **Manifest PWA**: [`public/manifest.json`](file:///public/manifest.json) — zawiera pe³n¹ konfiguracjê, ikony 192x192, 512x512 maskable, kolory paska stanu (`#022c22`) i skróty akcji.
2. **Digital Asset Links**: [`public/.well-known/assetlinks.json`](file:///public/.well-known/assetlinks.json) — weryfikuje w³asnoœæ domeny, usuwaj¹c pasek przegl¹darki Chrome w aplikacji na telefonie.
3. **TWA Manifest**: [`twa-manifest.json`](file:///twa-manifest.json) — szablon projektu dla narzêdzia Bubblewrap CLI.

---

## 3. Generowanie klucza podpisu (Keystore)
Jeœli jeszcze nie posiadasz pliku `android.keystore`, wygeneruj go w terminalu:
```bash
keytool -genkey -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000
```
*(Zapisz has³o keystore w bezpiecznym mened¿erze hase³!)*

Aby sprawdziæ odcisk cyfrowy SHA-256 swojego klucza i wkleiæ go do `public/.well-known/assetlinks.json`:
```bash
keytool -list -v -keystore android.keystore -alias android
```

---

## 4. Budowanie paczki produkcyjnej (.aab)

### Sposób A: Bubblewrap CLI (Zalecany przez Google)
W katalogu g³ównym projektu uruchom:
```bash
npx @bubblewrap/cli build
```
Narzêdzie wygeneruje zoptymalizowany plik `app-release-bundle.aab`.

### Sposób B: PWABuilder (Brak koniecznoœci instalowania Android SDK lokalnie)
1. WjedŸ na [pwabuilder.com](https://www.pwabuilder.com)
2. Wpisz adres produkcyjny Twojej aplikacji: `https://naetacie.pl`
3. Kliknij **Package For Stores** -> **Google Play**
4. Pobierz gotowy pakiet `.zip` zawieraj¹cy podpisany plik `.aab`.

---

## 5. Przes³anie do Google Play Console
1. Zaloguj siê w [Google Play Console](https://play.google.com/console).
2. Wybierz **Utwórz aplikacjê**:
   - Nazwa: `NaEtacie — Praca i Zlecenia Budowlane`
   - Jêzyk domyœlny: `Polski`
   - Kategoria: `Biznes` / `Wydajnoœæ`
   - Darmowa / P³atna: `Bezp³atna`
3. W sekcji **Wydanie** -> **Produkcja** lub **Testy zamkniête** wgraj plik `.aab`.
4. Uzupe³nij opis, zrzuty ekranu (widok mapy 3D i listy ofert).
5. Wyœlij do weryfikacji Google.

