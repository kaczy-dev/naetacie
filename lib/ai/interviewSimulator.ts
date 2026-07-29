/**
 * AI Interview Simulator for Construction Jobs (NaEtacie).
 * Generates interactive interview questions, answer suggestions, and feedback.
 */

export interface QuestionStep {
  id: number;
  question: string;
  topic: 'uprawnienia' | 'doswiadczenie' | 'bezpieczenstwo' | 'wynagrodzenie';
  hint: string;
  options: string[];
  bestAnswerIndex: number;
  feedback: string;
}

export function generateInterviewQuestions(category: string, title: string): QuestionStep[] {
  const t = title.toLowerCase();

  const questions: QuestionStep[] = [
    {
      id: 1,
      question: `Jakie masz konkretne doświadczenie w pracy na stanowisku: "${title}"?`,
      topic: 'doswiadczenie',
      hint: 'Wskaż liczbę lat, obsługiwany sprzęt lub ukończone obiekty.',
      options: [
        'Mam ponad 3-5 lat doświadczenia na budowach mieszkaniowych i komercyjnych, pracuję samodzielnie.',
        'Dopiero zaczynam w branży, ale jestem bardzo pracowity i szybko się uczę.',
        'Pracowałem kilka miesięcy dorywczo u prywatnych inwestorów.',
      ],
      bestAnswerIndex: 0,
      feedback: 'Doskonale! Pracodawcy budowlani najbardziej cenią poparte konkretami lata doświadczenia.',
    },
    {
      id: 2,
      question: t.includes('elektryk')
        ? 'Czy posiadasz aktualne świadectwo kwalifikacyjne SEP (np. G1 do 1 kV)?'
        : t.includes('operator')
        ? 'Czy posiadasz uprawnienia UDT / książeczkę operatora maszyn roboczych?'
        : 'Jak oceniasz swoją znajomość rysunku technicznego i dokumentacji budowlanej?',
      topic: 'uprawnienia',
      hint: 'Wymagania formalne są kluczowym kryterium selekcji na wyższe stawki.',
      options: [
        'Tak, posiadam aktualne uprawnienia i certyfikaty potwierdzone dokumentami.',
        'Uprawnienia wygasły, ale planuję je odnowić w najbliższym miesiącu.',
        'Nie mam formalnych certyfikatów, pracuję na podstawie doświadczenia praktycznego.',
      ],
      bestAnswerIndex: 0,
      feedback: 'Aktualne uprawnienia bezpośrednio zwiększają Twoją stawkę godzinową o 15-30%.',
    },
    {
      id: 3,
      question: 'Jak reagujesz w sytuacji, gdy na budowie zauważysz zagrożenie bezpieczeństwa (BHP)?',
      topic: 'bezpieczenstwo',
      hint: 'Bezpieczeństwo na budowie jest najwyższym priorytetem kierownika budowy.',
      options: [
        'Natychmiast wstrzymuję niebezpieczną pracę, zabezpieczam teren i zgłaszam kierownikowi.',
        'Kontynuuję pracę uważając na siebie, nie ingeruję w działania innych.',
        'Lekceważę drobne usterki, liczy się wykonany tempo i metraż.',
      ],
      bestAnswerIndex: 0,
      feedback: 'Odpowiedź idealna. Odpowiedzialność za BHP wyróżnia profesjonalistów.',
    },
    {
      id: 4,
      question: 'Jakie masz oczekiwania finansowe (stawka netto / miesięczna)?',
      topic: 'wynagrodzenie',
      hint: 'Odniesienie do średnich stawek rynkowych w Szczecinie.',
      options: [
        'Oczekuję stawki rynkowej rzędu 35–50 zł/h netto (lub 7000–9000 zł netto miesięcznie), zależnie od zakresu zadań.',
        'Zgodzę się na minimalną stawkę, zależy mi tylko na szybkim zatrudnieniu.',
        'Nie mam zdania, oczekuję propozycji ze strony firmy.',
      ],
      bestAnswerIndex: 0,
      feedback: 'Świetnie uzasadniona propozycja. Podanie zakresu rynkowego daje przestrzeń do negocjacji.',
    },
  ];

  return questions;
}
