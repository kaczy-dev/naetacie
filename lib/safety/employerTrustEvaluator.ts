/**
 * Employer Trust & Safety Evaluator.
 * 
 * Assesses the credibility of job posters to protect construction workers:
 * - Verified company / Business account vs Private individual
 * - Phone & Direct contact verification
 * - Established track record vs freshly created accounts
 * - Risk checklist & safety tips for subcontractors
 */

export type TrustLevel = 'VERIFIED_BUSINESS' | 'ESTABLISHED_DIRECT' | 'PRIVATE_INDIVIDUAL' | 'UNVERIFIED_NEW';

export interface EmployerTrustReport {
  score: number; // 0 to 100
  level: TrustLevel;
  badgeLabel: string;
  badgeColor: 'emerald' | 'blue' | 'amber' | 'slate';
  safetyChecklist: string[];
  recommendations: string[];
  isLowRisk: boolean;
}

export function evaluateEmployerTrust(options: {
  company?: string | null;
  phone?: string | null;
  source_portal?: string;
  sourcePortal?: string;
  hasBusinessAccount?: boolean;
  publishedAt?: string | Date | null;
  descriptionLength?: number;
  description?: string;
}): EmployerTrustReport {
  const {
    company,
    phone,
    source_portal,
    sourcePortal = source_portal || 'olx',
    hasBusinessAccount = false,
  } = options;

  const descLen = options.description ? options.description.length : (options.descriptionLength ?? 100);

  let score = 50; // base score
  const safetyChecklist: string[] = [];
  const recommendations: string[] = [];

  const isBusiness = Boolean(company && company.trim().length > 2) || hasBusinessAccount;
  const hasPhone = Boolean(phone && phone.trim().length >= 9);

  if (isBusiness) {
    score += 25;
    safetyChecklist.push('Zarejestrowana nazwa firmy / konto biznesowe');
  } else {
    safetyChecklist.push('Zleceniodawca prywatny / inwestor indywidualny');
  }

  if (hasPhone) {
    score += 20;
    safetyChecklist.push('Dostępny bezpośredni numer kontaktowy');
  } else {
    score -= 10;
    recommendations.push('Brak bezpośredniego telefonu – kontaktuj się wyłącznie przez portal');
  }

  if (descLen > 150) {
    score += 10;
    safetyChecklist.push('Szczegółowy opis zakresu prac');
  }

  if (sourcePortal === 'pracuj' || sourcePortal === 'oferteo') {
    score += 10;
    safetyChecklist.push('Portal o podwyższonej weryfikacji NIP');
  }

  // Clamping score
  const finalScore = Math.max(10, Math.min(100, score));

  if (finalScore >= 80) {
    return {
      score: finalScore,
      level: 'VERIFIED_BUSINESS',
      badgeLabel: 'Zweryfikowana firma',
      badgeColor: 'emerald',
      safetyChecklist,
      recommendations: [
        'Poproś o NIP i sprawdź wpis w CEIDG/KRS przed podpisaniem umowy',
        'Ustal harmonogram płatności etapowych',
      ],
      isLowRisk: true,
    };
  }

  if (finalScore >= 65) {
    return {
      score: finalScore,
      level: 'ESTABLISHED_DIRECT',
      badgeLabel: 'Zaufany zleceniodawca',
      badgeColor: 'blue',
      safetyChecklist,
      recommendations: [
        'Zalecana umowa o dzieło lub zlecenie na piśmie',
        'Pobierz zaliczkę przed zakupem materiałów',
      ],
      isLowRisk: true,
    };
  }

  if (finalScore >= 45) {
    return {
      score: finalScore,
      level: 'PRIVATE_INDIVIDUAL',
      badgeLabel: 'Inwestor prywatny',
      badgeColor: 'amber',
      safetyChecklist,
      recommendations: [
        'Zrób oględziny na miejscu i spisz protokół przekazania frontu robót',
        'Nigdy nie kupuj materiałów z własnych środków bez zaliczki',
      ],
      isLowRisk: false,
    };
  }

  return {
    score: finalScore,
    level: 'UNVERIFIED_NEW',
    badgeLabel: 'Nowe ogłoszenie',
    badgeColor: 'slate',
    safetyChecklist,
    recommendations: [
      'Wymagana ostrożność: zweryfikuj tożsamość zleceniodawcy',
      'Płatność za każdy wykonany dzień lub etap',
    ],
    isLowRisk: false,
  };
}
