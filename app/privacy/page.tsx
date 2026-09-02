import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Polityka Prywatności i RODO — NaEtacie',
  description: 'Zasady przetwarzania danych osobowych i polityka prywatności platformy NaEtacie zgodnie z RODO.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Powrót do aplikacji
        </Link>

        {/* Header */}
        <div className="border-b border-slate-800 pb-6 space-y-2">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <ShieldCheck className="w-7 h-7" />
            <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white">
              Polityka Prywatności i Informacja RODO
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Ostatnia aktualizacja: 2 września 2026 r. • Zgodność z Rozporządzeniem UE 2016/679 (RODO)
          </p>
        </div>

        {/* Section 1: Administrator */}
        <section className="space-y-3 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" /> 1. Administrator Danych Osobowych
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Administratorem platformy internetowej oraz aplikacji mobilnej <strong>NaEtacie</strong> jest podmiot operujący w aglomeracji szczecińskiej (dalej: „Administrator”).
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Kontakt w sprawach związanych z ochroną danych osobowych: <span className="font-mono text-emerald-400">kontakt@naetacie.pl</span>.
          </p>
        </section>

        {/* Section 2: Cel i Podstawa Prawna */}
        <section className="space-y-3 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" /> 2. Cel i Podstawa Prawna Przetwarzania Danych
          </h2>
          <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
            <li>
              <strong>Agregacja publicznie dostępnych ogłoszeń:</strong> Przetwarzanie publicznie opublikowanych danych kontaktowych pracodawców i zleceniodawców odbywa się na podstawie <strong>Art. 6 ust. 1 lit. f RODO</strong> (prawnie uzasadniony interes Administratora polegający na ułatwianiu kontaktu pomiędzy inwestorami a fachowcami).
            </li>
            <li>
              <strong>Świadczenie usług drogą elektroniczną:</strong> Umożliwienie wyszukiwania, geolokalizacji na mapie 3D oraz bezpośredniego kontaktu telefonicznego/SMS.
            </li>
            <li>
              <strong>Płatności i Pakiety PRO:</strong> Realizacja zamówień mikropłatności BLIK za pośrednictwem certyfikowanych operatorów płatności (zgodność z PCI-DSS).
            </li>
          </ul>
        </section>

        {/* Section 3: Prawa Użytkownika & Opt-Out */}
        <section className="space-y-3 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-400" /> 3. Prawa Osób, Których Dane Dotyczą (Art. 15-21 RODO)
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Każdej osobie, której dane dotyczą, przysługuje prawo do:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Dostępu do swoich danych
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Sprostowania danych
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Usunięcia danych („prawo do bycia zapomnianym”)
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Sprzeciwu wobec przetwarzania (Opt-Out)
            </div>
          </div>
          <p className="text-xs text-slate-400 pt-2">
            W celu natychmiastowego wycofania ogłoszenia lub usunięcia numeru telefonu z indeksu, wyślij zgłoszenie na adres <span className="font-mono text-emerald-400">kontakt@naetacie.pl</span> lub skorzystaj z opcji „Zgłoś ogłoszenie” w aplikacji.
          </p>
        </section>

        {/* Section 4: Bezpieczeństwo i Pliki Cookie */}
        <section className="space-y-3 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" /> 4. Pamięć Lokalna i Bezpieczeństwo
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Aplikacja korzysta z bezpiecznej pamięci przeglądarki (LocalStorage i IndexedDB) do przechowywania ulubionych ofert, ustawień filtrów oraz działania w trybie offline (PWA). Żadne poufne dane kart płatniczych nie są gromadzone ani przetwarzane na serwerach NaEtacie.
          </p>
        </section>
      </div>
    </div>
  );
}
