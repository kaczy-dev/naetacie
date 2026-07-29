/**
 * Zero-Cost Rule-Based AI/NLP Job Data Extractor.
 * Operates 100% locally with zero external API dependencies or costs.
 * Extracts structured attributes: certifications, benefits, experience level,
 * salary ranges, and work conditions.
 */

export interface ExtractedJobTraits {
  experience_level: 'Brak doświadczenia' | '1–3 lata' | 'Powyżej 3 lat';
  certifications: string[];
  benefits: string[];
  employment_type_normalized: string;
  salary_parsed: {
    min: number | null;
    max: number | null;
    currency: string;
    unit: 'hourly' | 'monthly' | 'project';
  } | null;
  accommodation_provided: boolean;
  transport_provided: boolean;
}

const CERTIFICATION_PATTERNS: { name: string; rx: RegExp }[] = [
  { name: 'Uprawnienia SEP', rx: /\bsep\b|uprawnienia elektryczne|sep g1|sep g2|sep g3/i },
  { name: 'Uprawnienia UDT', rx: /\budt\b|uprawnienia udt|operator wózka|wózek widłowy/i },
  { name: 'Certyfikat F-gazowy', rx: /f-?gaz|f-?gazowy|certyfikat f-gaz/i },
  { name: 'Prawo jazdy kat. B', rx: /prawo jazdy kat\.?\s*b|prawo jazdy b/i },
  { name: 'Prawo jazdy kat. C / C+E', rx: /prawo jazdy kat\.?\s*c|kat\.?\s*c\+e|kierowca c/i },
  { name: 'Uprawnienia HDS', rx: /\bhds\b|operator hds/i },
  { name: 'Praca na wysokości', rx: /praca na wysokości|badania wysokościowe|brak lęku wysokości/i },
  { name: 'Uprawnienia spawalnicze', rx: /uprawnienia spawalnicze|spawacz mig|spawacz mag|spawacz tig/i },
];

const BENEFIT_PATTERNS: { name: string; rx: RegExp }[] = [
  { name: 'Zakwaterowanie gratis', rx: /zakwaterowanie|darmowe mieszkanie|nocleg|zapewniamy nocleg/i },
  { name: 'Darmowy transport', rx: /dowóz|dojazd do pracy|darmowy transport|bus służbowy/i },
  { name: 'Narzędzia i odzież', rx: /narzędzia|odzież robocza|zapewniamy sprzęt|auto służbowe/i },
  { name: 'Płatne nadgodziny', rx: /nadgodziny|możliwość nadgodzin|płatne nadgodziny/i },
  { name: 'Premie i bonusy', rx: /premia|premie|prowizja|bonus/i },
  { name: 'Tygodniowe wypłaty', rx: /tygodniówka|rozliczenie tygodniowe|wypłata co tydzień/i },
];

/**
 * Extracts structured traits from a job posting title and description.
 */
export function extractJobTraits(title: string, description: string): ExtractedJobTraits {
  const fullText = `${title} ${description}`;

  // 1. Certifications
  const certs: string[] = [];
  for (const cert of CERTIFICATION_PATTERNS) {
    if (cert.rx.test(fullText)) {
      certs.push(cert.name);
    }
  }

  // 2. Benefits
  const benefits: string[] = [];
  for (const ben of BENEFIT_PATTERNS) {
    if (ben.rx.test(fullText)) {
      benefits.push(ben.name);
    }
  }

  // 3. Experience level
  let expLevel: 'Brak doświadczenia' | '1–3 lata' | 'Powyżej 3 lat' = '1–3 lata';
  if (/nie wymagamy doświadczenia|bez doświadczenia|przyuczymy|dla początkujących|pomocnik/i.test(fullText)) {
    expLevel = 'Brak doświadczenia';
  } else if (/min\.?\s*5 lat|ponad 5 lat|doświadczony kierownik|samodzielny brygadzista|min\.?\s*3 lata/i.test(fullText)) {
    expLevel = 'Powyżej 3 lat';
  }

  // 4. Accommodation & Transport flags
  const accommodation = /zakwaterowanie|darmowe mieszkanie|nocleg|zapewniamy nocleg/i.test(fullText);
  const transport = /dowóz|dojazd do pracy|darmowy transport|bus służbowy/i.test(fullText);

  // 5. Employment type normalization
  let empType = 'Umowa o pracę';
  if (/b2b|działalność|faktura/i.test(fullText)) {
    empType = 'B2B';
  } else if (/zlecenie|umowa zlecenie|dniówka/i.test(fullText)) {
    empType = 'Umowa zlecenie';
  }

  // 6. Salary parsing
  let salaryParsed: ExtractedJobTraits['salary_parsed'] = null;
  const hourlyMatch = fullText.match(/(\d{2,3})\s*(?:–|-|do)\s*(\d{2,3})\s*zł(?:\/|\s*na\s*)h/i) || fullText.match(/(\d{2,3})\s*zł(?:\/|\s*na\s*)h/i);
  const monthlyMatch = fullText.match(/(\d{4,5})\s*(?:–|-|do)\s*(\d{4,5})\s*(?:zł|pln)/i) || fullText.match(/(\d{4,5})\s*(?:zł|pln)/i);

  if (hourlyMatch) {
    const min = parseInt(hourlyMatch[1], 10);
    const max = hourlyMatch[2] ? parseInt(hourlyMatch[2], 10) : min;
    salaryParsed = { min, max, currency: 'PLN', unit: 'hourly' };
  } else if (monthlyMatch) {
    const min = parseInt(monthlyMatch[1], 10);
    const max = monthlyMatch[2] ? parseInt(monthlyMatch[2], 10) : min;
    salaryParsed = { min, max, currency: 'PLN', unit: 'monthly' };
  }

  return {
    experience_level: expLevel,
    certifications: certs,
    benefits,
    employment_type_normalized: empType,
    salary_parsed: salaryParsed,
    accommodation_provided: accommodation,
    transport_provided: transport,
  };
}
