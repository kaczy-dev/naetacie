import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Scale, ShieldAlert, CheckSquare } from 'lucide-react';

export const metadata = {
  title: 'Regulamin Serwisu — NaEtacie',
  description: 'Regulamin i warunki korzystania z platformy ogłoszeń pracy i zleceń budowlanych NaEtacie w Szczecinie.',
};

export default function TermsPage() {
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
            <Scale className="w-7 h-7" />
            <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white">
              Regulamin Serwisu NaEtacie
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Wersja 1.2 • Obowiązuje od 2 września 2026 r.
          </p>
        </div>

        {/* Section 1: Postanowienia ogólne */}
        <section className="space-y-3 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" /> 1. Postanowienia Ogólne
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Niniejszy regulamin określa zasady korzystania z wyszukiwarki ofert pracy i zleceń budowlanych <strong>NaEtacie</strong>, w tym z interaktywnej mapy 3D Szczecina, narzędzi porównywania stawek i kalkulatorów wynagrodzeń.
          </p>
        </section>

        {/* Section 2: Charakter usługi */}
        <section className="space-y-3 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-400" /> 2. Zasady Świadczenia Usług
          </h2>
          <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
            <li>Serwis umożliwia bezpłatne przeglądanie ogłoszeń pracy z publicznych źródeł (OLX, Pracuj.pl, Indeed, Oferteo, Fixly).</li>
            <li>NaEtacie nie jest agencją zatrudnienia ani stroną umów zawieranych pomiędzy pracodawcami a pracownikami.</li>
            <li>Użytkownik zobowiązuje się do korzystania z serwisu w sposób zgodny z prawem i dobrymi obyczajami.</li>
          </ul>
        </section>

        {/* Section 3: Odpowiedzialność */}
        <section className="space-y-3 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-400" /> 3. Odpowiedzialność i Zgłaszanie Naruszeń
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Dokładamy wszelkich starań, aby prezentowane ogłoszenia były aktualne i zweryfikowane. W przypadku stwierdzenia oferty wprowadzającej w błąd lub nieaktualnej, prosimy o zgłoszenie na adres: <span className="font-mono text-emerald-400">kontakt@naetacie.pl</span>.
          </p>
        </section>
      </div>
    </div>
  );
}
