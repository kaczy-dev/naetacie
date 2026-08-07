/**
 * Construction Equipment, Tools & Machinery Extraction Engine.
 * Detects power tools, heavy machinery, vehicles, and specialized equipment
 * mentioned in job descriptions.
 */

export interface DetectedEquipment {
  category: 'Pojazdy' | 'Elektronarzędzia' | 'Maszyny Ciężkie' | 'Szalunki i Rusztowania' | 'Pomiary';
  name: string;
}

const EQUIPMENT_PATTERNS: Array<{
  category: DetectedEquipment['category'];
  name: string;
  rx: RegExp;
}> = [
  // Pojazdy
  { category: 'Pojazdy', name: 'Auto służbowe / Bus', rx: /bus\s+służbowy|samochód\s+służbowy|auto\s+służbowe|dojazd\s+busem/i },
  { category: 'Pojazdy', name: 'Auto z dźwigiem HDS', rx: /\bhds\b|auto\s+z\s+hds|dźwig\s+hds/i },
  { category: 'Pojazdy', name: 'Koparka kołowa / gąsienicowa', rx: /kopark[aa]|koparko-ładowark[aa]|cat|volvo|liebherr|kubota|bobcat/i },

  // Elektronarzędzia
  { category: 'Elektronarzędzia', name: 'Elektronarzędzia zawodowe', rx: /elektronarzędzia|hilti|makita|bosch|dewalt|festool/i },
  { category: 'Elektronarzędzia', name: 'Agregat tynkarski / malarski', rx: /agregat|pft|pft g4|pft g5|graco|agregat malarski|agregat tynkarski/i },
  { category: 'Elektronarzędzia', name: 'Spawarka MIG/MAG/TIG', rx: /spawark[aa]|mig\/mag|tig|spawanie/i },

  // Szalunki i Rusztowania
  { category: 'Szalunki i Rusztowania', name: 'Szalunki Doka / Peri', rx: /szalunk[ii]|doka|peri|szalowanie|szalunki systemowe/i },
  { category: 'Szalunki i Rusztowania', name: 'Rusztowania modułowe', rx: /rusztowani[aa]|rusztowanie ramowe|layher|plettac/i },
  { category: 'Szalunki i Rusztowania', name: 'Zwyżka / Podest ruchomy', rx: /zwyżk[aa]|podest ruchomy|podnośnik koszowy/i },

  // Pomiary
  { category: 'Pomiary', name: 'Niwelator laserowy', rx: /niwelator|laser płaszczyznowy|teodolit/i },
];

/**
 * Extracts equipment and tool tags from job text.
 */
export function extractEquipment(title: string, description: string): DetectedEquipment[] {
  const fullText = `${title} ${description}`;
  const detected: DetectedEquipment[] = [];
  const seenNames = new Set<string>();

  for (const item of EQUIPMENT_PATTERNS) {
    if (item.rx.test(fullText) && !seenNames.has(item.name)) {
      seenNames.add(item.name);
      detected.push({
        category: item.category,
        name: item.name,
      });
    }
  }

  return detected;
}
