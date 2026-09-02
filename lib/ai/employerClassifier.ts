/**
 * Construction Job Employer Classifier.
 * Classifies the source entity into:
 * 1. 'direct_investor' - Private apartment/home owner looking for direct renovations (no middlemen, cash/fast payment)
 * 2. 'contractor' - Construction firm, general contractor, or trade subcontractor
 * 3. 'agency' - Employment agency, temp work broker (KRAZ), recruiter
 */

import { EmployerClassification } from '@/lib/scraper/types';

export interface EmployerClassificationResult {
  type: EmployerClassification;
  confidence: number;
  labelPl: string;
  reason: string;
  isDirect: boolean;
}

const AGENCY_PATTERNS = [
  /\bagencj[ai]\s+(?:zatrudnienia|pracy)\b/i,
  /\bpraca\s+tymczasow[aa]\b/i,
  /\bkraz\b|\bnr\s+kraz\b|\bwpis\s+do\s+kraz\b/i,
  /\brekrutuj(?:emy|ą)\s+dla\s+(?:naszego\s+)?klienta\b/i,
  /\bdla\s+naszego\s+klienta\b/i,
  /\bpośrednictw[ao]\s+pracy\b/i,
  /\bwork\s+service\b|\brandstad\b|\badecco\b|\bmanpower\b|\botto\b|\bgi\s+group\b|\btrenkwalder\b|\bproman\b/i,
];

const DIRECT_INVESTOR_PATTERNS = [
  /\bmoj[ae]\s+(?:mieszkanie|dom|łazienk|kuchni)\b/i,
  /\bwłasn[ey]\s+(?:dom|mieszkanie|lokal)\b/i,
  /\bprywatni[ee]\b|\bosoba\s+prywatna\b/i,
  /\bszukam\s+(?:ekipy|fachowca|złotej\s+rączki)\s+do\s+remontu\s+(?:mojego|mieszkania|domu)/i,
  /\bzlecenie\s+od\s+właściciela\b/i,
  /\binwestor\s+prywatny\b/i,
  /\bdo\s+zrobienia\s+u\s+mnie\b/i,
  /\bdom\s+jednorodzinny\b/i,
  /\bwymiana\s+płytek\s+w\s+łazience\b/i,
];

const CONTRACTOR_PATTERNS = [
  /\bgłówny\s+wykonawca\b|\bgeneralny\s+wykonawca\b/i,
  /\bfirma\s+budowlan[aa]\b|\bprzedsiębiorstwo\s+budowlan[eo]\b/i,
  /\bzatrudnimy\s+(?:brygady|podwykonawców|ekipy)\b/i,
  /\bduża\s+inwestycja\b|\bstan\s+deweloperski\b|\bosiedle\b/i,
  /\bbudowa\s+bloków\b|\bhala\s+przemysłowa\b/i,
  /\bsp\.\s*z\s*o\.o\.\b|\bs\.a\.\b|\bspółka\b/i,
];

export function classifyEmployer(
  title: string,
  description: string,
  companyName?: string | null
): EmployerClassificationResult {
  const fullText = `${title} ${description} ${companyName || ''}`.toLowerCase();

  // 1. Check for Employment Agency (Highest priority because workers avoid them)
  for (const rx of AGENCY_PATTERNS) {
    if (rx.test(fullText)) {
      return {
        type: 'agency',
        confidence: 0.95,
        labelPl: 'Agencja pracy / Pośrednik',
        reason: 'Wykryto sygnaturę agencji zatrudnienia lub rekrutera',
        isDirect: false,
      };
    }
  }

  // 2. Check for Direct Investor / Private Homeowner
  for (const rx of DIRECT_INVESTOR_PATTERNS) {
    if (rx.test(fullText)) {
      return {
        type: 'direct_investor',
        confidence: 0.9,
        labelPl: 'Inwestor bezpośredni (Właściciel)',
        reason: 'Ogłoszenie dotyczy prywatnego zlecenia remontowego/domu',
        isDirect: true,
      };
    }
  }

  // 3. Check for General Contractor / Construction Company
  for (const rx of CONTRACTOR_PATTERNS) {
    if (rx.test(fullText)) {
      return {
        type: 'contractor',
        confidence: 0.85,
        labelPl: 'Firma budowlana / Wykonawca',
        reason: 'Wykryto bezpośrednią firmę budowlaną lub generalnego wykonawcę',
        isDirect: true,
      };
    }
  }

  // 4. Fallback heuristics based on company name presence
  if (companyName && companyName.trim().length > 2 && !companyName.includes('Zleceniodawca')) {
    return {
      type: 'contractor',
      confidence: 0.7,
      labelPl: 'Firma budowlana',
      reason: `Zgłoszone przez firmę: ${companyName}`,
      isDirect: true,
    };
  }

  // Default to direct investor for small classified ads without company info
  return {
    type: 'direct_investor',
    confidence: 0.6,
    labelPl: 'Zleceniodawca prywatny',
    reason: 'Brak profilu firmowego lub agencji pośrednictwa',
    isDirect: true,
  };
}
