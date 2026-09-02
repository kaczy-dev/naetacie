/**
 * AI-powered requirement and skill extractor for job announcements.
 * Parses raw title and description text to identify key job requirements,
 * qualifications, required tools, licenses, and employment conditions.
 */

export interface ExtractedRequirement {
  id: string;
  label: string;
  category: 'license' | 'experience' | 'tools' | 'condition' | 'perk';
  icon: string;
}

const PATTERNS: Array<{
  regex: RegExp;
  id: string;
  label: string;
  category: ExtractedRequirement['category'];
  icon: string;
}> = [
  { regex: /uprawnienia\s+sep|sep\b/i, id: 'sep', label: 'Uprawnienia SEP', category: 'license', icon: '⚡' },
  { regex: /prawo\s+jazdy|kat\.?\s*[bcde]/i, id: 'driver', label: 'Prawo Jazdy', category: 'license', icon: '🚗' },
  { regex: /f-gaz|certyfikat\s+f-gaz/i, id: 'fgaz', label: 'Certyfikat F-Gaz', category: 'license', icon: '❄️' },
  { regex: /badania\s+wysokoś/i, id: 'heights', label: 'Praca na wysokości', category: 'license', icon: '🧗' },
  { regex: /min\.?\s*\d+\s*lat|doświadczenie/i, id: 'experience', label: 'Wymagane doświadczenie', category: 'experience', icon: '⭐' },
  { regex: /własne\s+narzędzia|własny\s+sprzęt/i, id: 'tools', label: 'Własne narzędzia', category: 'tools', icon: '🧰' },
  { regex: /własn[ye]\s+(?:auto|bus|samochód)|auto\s+służbowe|samochód\s+służbowy|\bbus\b/i, id: 'vehicle', label: 'Samochód służbowy / bus', category: 'tools', icon: '🚐' },
  { regex: /b2b|faktura\s+vat/i, id: 'b2b', label: 'Możliwość B2B', category: 'condition', icon: '📄' },
  { regex: /umowa\s+o\s+pracę|uop\b/i, id: 'uop', label: 'Umowa o Pracę', category: 'condition', icon: '📜' },
  { regex: /zakwaterowanie|darmowy\s+nocleg/i, id: 'housing', label: 'Zapewnione zakwaterowanie', category: 'perk', icon: '🏠' },
  { regex: /od\s+zaraz|pilne/i, id: 'urgent', label: 'Praca od zaraz', category: 'condition', icon: '🔥' },
  { regex: /szkolenia|możliwość\s+przyuczenia/i, id: 'training', label: 'Szkolenia / Przyuczenie', category: 'perk', icon: '🎓' },
];

/**
 * Extracts structured requirements from announcement title and description.
 */
export function extractRequirements(title: string, description: string): ExtractedRequirement[] {
  const combinedText = `${title} ${description}`;
  const extracted: ExtractedRequirement[] = [];
  const seenIds = new Set<string>();

  for (const pattern of PATTERNS) {
    if (pattern.regex.test(combinedText) && !seenIds.has(pattern.id)) {
      seenIds.add(pattern.id);
      extracted.push({
        id: pattern.id,
        label: pattern.label,
        category: pattern.category,
        icon: pattern.icon,
      });
    }
  }

  return extracted;
}
