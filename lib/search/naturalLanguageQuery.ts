/**
 * Natural Language Query Parser for Polish Construction & Trade Searches.
 * Parses freeform natural language strings into structured query parameters.
 * e.g., "glazurnik centrum zaraz za min 8000 na b2b" ->
 * { keyword: 'glazurnik', district: 'centrum', minSalary: 8000, isUrgent: true, employmentType: 'B2B' }
 */

export interface ParsedTradeQuery {
  rawQuery: string;
  cleanKeyword: string;
  district: string | null;
  minSalary: number | null;
  isUrgent: boolean;
  employmentType: string | null;
  matchedCategory: string | null;
}

const DISTRICT_SYNONYMS: Record<string, string[]> = {
  'Śródmieście': ['śródmieście', 'centrum', 'srodmiescie', 'stare miasto', 'turzyn'],
  'Prawobrzeże': ['prawobrzeże', 'prawobrzeze', 'dąbie', 'dabie', 'słoneczne', 'majowe', 'zdroje', 'bukowe', 'podjuchy'],
  'Pogodno': ['pogodno', 'krzekowo', 'bezrzecze', 'gumieńce', 'gumience', 'pomorzany'],
  'Warszewo': ['warszewo', 'niebuszewo', 'żelechowa', 'zelechowa', 'osów', 'osow', 'golęcino'],
  'Police': ['police', 'mścięcino', 'msciecino', 'tanowo'],
};

const TRADE_CATEGORIES: Record<string, string[]> = {
  'wykończenia': ['glazurnik', 'płytkarz', 'fliziarz', 'szpachlarz', 'malarz', 'regips', 'gk', 'panele', 'wykończeniowiec', 'tynkarz'],
  'instalacje': ['hydraulik', 'elektryk', 'monter', 'klimatyzacja', 'pompy ciepła', 'wentylacja', 'gazownik', 'co'],
  'ogólnobudowlane': ['murarz', 'cieśla', 'zbrojarz', 'betoniarz', 'pomocnik', 'brygadzista', 'kierownik budowy', 'dekarz'],
};

export function parseNaturalLanguageQuery(query: string): ParsedTradeQuery {
  if (!query || !query.trim()) {
    return {
      rawQuery: '',
      cleanKeyword: '',
      district: null,
      minSalary: null,
      isUrgent: false,
      employmentType: null,
      matchedCategory: null,
    };
  }

  const text = query.toLowerCase().trim();
  let remainingText = text;

  // 1. Detect Urgency (zaraz, pilne, cito, na wczoraj, natychmiast)
  const urgentRegex = /\b(piln[a-z]*|zaraz|cito|na wczoraj|od zaraz|natychmiast)\b/i;
  const isUrgent = urgentRegex.test(remainingText);
  remainingText = remainingText.replace(urgentRegex, ' ');

  // 2. Detect Employment Type (B2B, UoP, zlecenie, faktura)
  let employmentType: string | null = null;
  if (/\b(b2b|faktura|fv|kontrakt)\b/i.test(remainingText)) {
    employmentType = 'B2B';
    remainingText = remainingText.replace(/\b(b2b|faktura|fv|kontrakt)\b/i, ' ');
  } else if (/\b(uop|umowa o pracę|etat)\b/i.test(remainingText)) {
    employmentType = 'Umowa o pracę';
    remainingText = remainingText.replace(/\b(uop|umowa o pracę|etat)\b/i, ' ');
  } else if (/\b(zlecenie|uz)\b/i.test(remainingText)) {
    employmentType = 'Umowa zlecenie';
    remainingText = remainingText.replace(/\b(zlecenie|uz)\b/i, ' ');
  }

  // 3. Detect Min Salary (e.g., "min 8000", "od 7k", "powyżej 9000", "8000 zł")
  let minSalary: number | null = null;
  const salaryMatch = remainingText.match(/(?:od|min|minimum|powyżej|>|stawka)\s*(\d{1,2}(?:\s?\d{3})|\d+k?)/i) ||
                      remainingText.match(/(\d{4,6})\s*(?:zł|pln|netto|brutto)/i);

  if (salaryMatch && salaryMatch[1]) {
    const numStr = salaryMatch[1].replace(/\s/g, '').toLowerCase();
    if (numStr.endsWith('k')) {
      minSalary = parseFloat(numStr.replace('k', '')) * 1000;
    } else {
      minSalary = parseInt(numStr, 10);
    }
    remainingText = remainingText.replace(salaryMatch[0], ' ');
  }

  // 4. Detect District in Szczecin
  let matchedDistrict: string | null = null;
  for (const [districtName, synonyms] of Object.entries(DISTRICT_SYNONYMS)) {
    for (const syn of synonyms) {
      const synRegex = new RegExp(`\\b${syn}\\b`, 'i');
      if (synRegex.test(remainingText)) {
        matchedDistrict = districtName;
        remainingText = remainingText.replace(synRegex, ' ');
        break;
      }
    }
    if (matchedDistrict) break;
  }

  // 5. Detect Trade Category
  let matchedCategory: string | null = null;
  for (const [catName, keywords] of Object.entries(TRADE_CATEGORIES)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        matchedCategory = catName;
        break;
      }
    }
    if (matchedCategory) break;
  }

  // 6. Clean remaining keywords
  const cleanKeyword = remainingText
    .replace(/\b(za|w|na|ze|dla|darmowe|szukam|oferta|praca|do)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    rawQuery: query,
    cleanKeyword: cleanKeyword || text,
    district: matchedDistrict,
    minSalary: minSalary && minSalary > 1000 ? minSalary : null,
    isUrgent,
    employmentType,
    matchedCategory,
  };
}
