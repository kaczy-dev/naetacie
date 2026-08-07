/**
 * Anti-Spam, Scam & Fraud Detection Engine for Job Announcements.
 * Operates 100% locally with zero external API dependencies or latency.
 * Evaluates job titles, descriptions, salaries, and phone numbers for scam indicators.
 */

export interface FraudAnalysisResult {
  isSuspicious: boolean;
  score: number; // 0.0 (100% legitimate) to 1.0 (definitely fraud/scam)
  reasons: string[];
}

/** Suspicious keywords indicating potential recruitment fee scams or spam */
const SUSPICIOUS_PHRASES = [
  /wpłać\s+zaliczkę|opłata\s+rekrutacyjna|płatne\s+szkolenie\s+wstępne/i,
  /zarabiaj\s+bez\s+wychodzenia\s+z\s+domu\s*\d{4,}/i,
  /praca\s+na\s+kliknięcia|przelewaj\s+pieniądze|praca\s+krypto/i,
  /prześlij\s+skan\s+dowodu|wysłanie\s+dowodu\s+osobistego/i,
  /sms\s+premium|wyślij\s+sms\s+pod\s+numer/i,
];

/** Premium rate Polish phone prefixes (e.g. 70x, 7x, 90x) */
const PREMIUM_SMS_REGEX = /^(?:70|71|72|73|74|75|76|77|78|79|90|91|92)/;

/**
 * Analyzes a job announcement for spam, unrealistic claims, or fraud indicators.
 */
export function analyzeJobFraud(ad: {
  title?: string | null;
  description?: string | null;
  price?: string | number | null;
  phone?: string | null;
}): FraudAnalysisResult {
  const reasons: string[] = [];
  let score = 0.0;

  const title = (ad.title || '').trim();
  const desc = (ad.description || '').trim();
  const fullText = `${title} ${desc}`;

  // 1. Check for scam & upfront fee phrases
  for (const rx of SUSPICIOUS_PHRASES) {
    if (rx.test(fullText)) {
      score += 0.45;
      reasons.push(`Podejrzany zwrot w treści: "${rx.source.replace(/\\/g, '')}"`);
    }
  }

  // 2. Unrealistic salary evaluation (e.g. > 30,000 PLN/mo or > 250 PLN/h for non-management/helper roles)
  let numericPrice: number | null = null;
  if (typeof ad.price === 'number') {
    numericPrice = ad.price;
  } else if (typeof ad.price === 'string') {
    const match = ad.price.match(/(\d[\d\s]*\d|\d+)/);
    if (match) {
      numericPrice = parseInt(match[1].replace(/\s/g, ''), 10);
    }
  }

  const isHelperOrUnskilled = /pomocnik|bez doświadczenia|przyuczenie|proste prace/i.test(fullText);
  if (numericPrice) {
    if (numericPrice > 35000) {
      score += 0.4;
      reasons.push(`Nierealnie wysokie wynagrodzenie (${numericPrice} zł)`);
    } else if (isHelperOrUnskilled && numericPrice > 15000) {
      score += 0.35;
      reasons.push(`Za wysokie wynagrodzenie (${numericPrice} zł) jak na stanowisko pomocnika`);
    }
  }

  // 3. Premium SMS phone number detection
  if (ad.phone) {
    const digitsOnly = ad.phone.replace(/\D/g, '');
    const cleanDigits = digitsOnly.startsWith('48') ? digitsOnly.slice(2) : digitsOnly;
    if (cleanDigits.length === 9 && PREMIUM_SMS_REGEX.test(cleanDigits) && /70[0-9]{7}/.test(cleanDigits)) {
      score += 0.5;
      reasons.push(`Numer telefonu o podwyższonej opłacie (SMS Premium): ${ad.phone}`);
    }
  }

  // 4. Excessively short description or missing substance
  if (desc.length > 0 && desc.length < 15) {
    score += 0.15;
    reasons.push('Bardzo krótki, nierzetelny opis oferty');
  }

  const normalizedScore = Math.min(1.0, Math.max(0.0, score));

  return {
    isSuspicious: normalizedScore >= 0.4,
    score: Number(normalizedScore.toFixed(2)),
    reasons,
  };
}
