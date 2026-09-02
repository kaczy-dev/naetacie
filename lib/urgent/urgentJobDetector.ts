/**
 * Urgent Job & Emergency Callout Detector.
 * 
 * Analyzes announcement text for urgency indicators:
 * - "od zaraz", "na jutro", "pilnie", "cito", "awaria", "weekend"
 * Calculates an urgency score, rate boost estimation, and generates a radar badge.
 */

export type UrgencyLevel = 'EMERGENCY_CITO' | 'URGENT_TODAY' | 'WEEKEND_BOUNTY' | 'NORMAL';

export interface UrgencyAnalysis {
  isUrgent: boolean;
  level: UrgencyLevel;
  score: number; // 0.0 to 1.0
  reasons: string[];
  estimatedBountyBonusPercent: number; // e.g. 25%, 50%
  badgeLabel: string;
  badgeColor: 'rose' | 'amber' | 'blue' | 'gray';
}

const CITO_PATTERNS = [
  { rx: /\b(na\s*cito|cito|awaria|natychmiast|w\s*tej\s*chwili)\b/i, reason: 'Zlecenie awaryjne / na cito', weight: 0.9, bonus: 50 },
  { rx: /\b(od\s*zaraz|od\s*dzisiaj|od\s*jutra|na\s*jutro|od\s*ręki)\b/i, reason: 'Start pracy od zaraz / jutro', weight: 0.8, bonus: 30 },
  { rx: /\b(pilnie|pilne|bardzo\s*pilne|poszukiwan[iy]\s*pilnie)\b/i, reason: 'Pilne poszukiwanie wykonawcy', weight: 0.75, bonus: 25 },
  { rx: /\b(weekend|sobota|niedziela|nadgodziny|dodatkowo\s*płatne)\b/i, reason: 'Praca weekendowa / nadgodziny z premią', weight: 0.7, bonus: 35 },
  { rx: /\b(ekipa\s*nie\s*przyszła|porzucon[ae]|dokończen|ratunk)\b/i, reason: 'Dokończenie po innej ekipie / ratunkowe', weight: 0.85, bonus: 40 },
];

export function detectJobUrgency(title: string, description: string): UrgencyAnalysis {
  const text = `${title} ${description}`.toLowerCase();

  let maxWeight = 0;
  let estimatedBonus = 0;
  const matchedReasons: string[] = [];

  for (const pattern of CITO_PATTERNS) {
    if (pattern.rx.test(text)) {
      matchedReasons.push(pattern.reason);
      if (pattern.weight > maxWeight) {
        maxWeight = pattern.weight;
      }
      if (pattern.bonus > estimatedBonus) {
        estimatedBonus = pattern.bonus;
      }
    }
  }

  if (maxWeight >= 0.85) {
    return {
      isUrgent: true,
      level: 'EMERGENCY_CITO',
      score: maxWeight,
      reasons: matchedReasons,
      estimatedBountyBonusPercent: estimatedBonus || 50,
      badgeLabel: '🚨 NA CITO / AWARIA (+50%)',
      badgeColor: 'rose',
    };
  }

  if (maxWeight >= 0.75) {
    return {
      isUrgent: true,
      level: 'URGENT_TODAY',
      score: maxWeight,
      reasons: matchedReasons,
      estimatedBountyBonusPercent: estimatedBonus || 25,
      badgeLabel: '🔥 PILNE (OD ZARAZ)',
      badgeColor: 'rose',
    };
  }

  if (maxWeight >= 0.6) {
    return {
      isUrgent: true,
      level: 'WEEKEND_BOUNTY',
      score: maxWeight,
      reasons: matchedReasons,
      estimatedBountyBonusPercent: estimatedBonus || 20,
      badgeLabel: '⚡ SZYBKI START',
      badgeColor: 'amber',
    };
  }

  return {
    isUrgent: false,
    level: 'NORMAL',
    score: 0,
    reasons: [],
    estimatedBountyBonusPercent: 0,
    badgeLabel: '',
    badgeColor: 'gray',
  };
}
