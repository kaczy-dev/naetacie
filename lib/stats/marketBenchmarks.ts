/**
 * Szczecin Area Construction Salary Benchmarks & Opportunity Rating Engine.
 * Analyzes market averages per trade and calculates percentage deviations.
 */

export interface MarketBenchmark {
  trade: string;
  avgMonthlyPln: number;
  avgHourlyPln: number;
}

export const SZCZECIN_MARKET_BENCHMARKS: Record<string, MarketBenchmark> = {
  elektryk: { trade: 'Elektryk / Instalacje', avgMonthlyPln: 8000, avgHourlyPln: 45 },
  hydraulik: { trade: 'Hydraulik / CO / Wod-Kan', avgMonthlyPln: 8500, avgHourlyPln: 48 },
  murarz: { trade: 'Murarz / Zbrojarz', avgMonthlyPln: 7500, avgHourlyPln: 42 },
  dekarz: { trade: 'Dekarz / Pokrycia dachowe', avgMonthlyPln: 8000, avgHourlyPln: 45 },
  operator: { trade: 'Operator koparki / Maszyn', avgMonthlyPln: 8500, avgHourlyPln: 48 },
  malarz: { trade: 'Malarz / Wykończenia', avgMonthlyPln: 6500, avgHourlyPln: 38 },
  stolarz: { trade: 'Stolarz / Monter', avgMonthlyPln: 7200, avgHourlyPln: 40 },
  spawacz: { trade: 'Spawacz MIG/MAG', avgMonthlyPln: 8500, avgHourlyPln: 48 },
  kierownik: { trade: 'Kierownik budowy', avgMonthlyPln: 13500, avgHourlyPln: 75 },
  ogólny: { trade: 'Prace ogólnobudowlane', avgMonthlyPln: 6000, avgHourlyPln: 35 },
};

export interface MarketEvaluation {
  benchmarkTrade: string;
  avgPln: number;
  offeredPln: number | null;
  percentageDiff: number | null;
  badgeLabel: string;
  badgeColor: 'emerald' | 'amber' | 'blue' | 'slate';
}

function parsePriceToMonthlyNumber(priceStr: string | null): number | null {
  if (!priceStr) return null;

  const hourlyMatch = priceStr.match(/(\d+)(?:–|-|do)?(\d+)?\s*zł(?:\/|\s*na\s*)h/i);
  if (hourlyMatch) {
    const val = parseInt(hourlyMatch[2] || hourlyMatch[1], 10);
    return val * 168; // Convert hourly rate to monthly (168h/month)
  }

  const monthlyMatch = priceStr.match(/(\d+[\s.]?\d*)\s*(?:–|-|do)?\s*(\d+[\s.]?\d*)?\s*(?:zł|pln)/i);
  if (monthlyMatch) {
    const raw = monthlyMatch[2] || monthlyMatch[1];
    const num = parseInt(raw.replace(/\s+/g, ''), 10);
    return num > 1000 ? num : num * 168;
  }

  return null;
}

export function evaluateMarketSalary(title: string, priceStr: string | null): MarketEvaluation {
  const t = title.toLowerCase();
  let benchmarkKey = 'ogólny';

  if (t.includes('kierownik')) benchmarkKey = 'kierownik';
  else if (t.includes('elektryk')) benchmarkKey = 'elektryk';
  else if (t.includes('hydraulik')) benchmarkKey = 'hydraulik';
  else if (t.includes('murarz') || t.includes('zbrojarz') || t.includes('cieśla')) benchmarkKey = 'murarz';
  else if (t.includes('dekarz')) benchmarkKey = 'dekarz';
  else if (t.includes('operator') || t.includes('kopark')) benchmarkKey = 'operator';
  else if (t.includes('malarz') || t.includes('glazurnik') || t.includes('szpachl')) benchmarkKey = 'malarz';
  else if (t.includes('spawacz')) benchmarkKey = 'spawacz';
  else if (t.includes('stolarz')) benchmarkKey = 'stolarz';

  const benchmark = SZCZECIN_MARKET_BENCHMARKS[benchmarkKey];
  const offeredPln = parsePriceToMonthlyNumber(priceStr);

  if (!offeredPln) {
    return {
      benchmarkTrade: benchmark.trade,
      avgPln: benchmark.avgMonthlyPln,
      offeredPln: null,
      percentageDiff: null,
      badgeLabel: `Średnia rynkowa: ~${benchmark.avgMonthlyPln} zł/mies.`,
      badgeColor: 'slate',
    };
  }

  const diffPct = Math.round(((offeredPln - benchmark.avgMonthlyPln) / benchmark.avgMonthlyPln) * 100);

  if (diffPct >= 10) {
    return {
      benchmarkTrade: benchmark.trade,
      avgPln: benchmark.avgMonthlyPln,
      offeredPln,
      percentageDiff: diffPct,
      badgeLabel: `🔥 Powyżej średniej (+${diffPct}%)`,
      badgeColor: 'emerald',
    };
  }

  if (diffPct <= -10) {
    return {
      benchmarkTrade: benchmark.trade,
      avgPln: benchmark.avgMonthlyPln,
      offeredPln,
      percentageDiff: diffPct,
      badgeLabel: `Poniżej średniej (${diffPct}%)`,
      badgeColor: 'amber',
    };
  }

  return {
    benchmarkTrade: benchmark.trade,
    avgPln: benchmark.avgMonthlyPln,
    offeredPln,
    percentageDiff: diffPct,
    badgeLabel: `Rynkowa stawka (~${benchmark.avgMonthlyPln} zł)`,
    badgeColor: 'blue',
  };
}

/**
 * Free AI Salary Estimator (Zero-Cost, No Paid API Required).
 * Estimates realistic monthly PLN salary range for job offers missing price info.
 */
export function estimateSalaryRange(title: string, description: string = ''): { minPln: number; maxPln: number; text: string } {
  const evalResult = evaluateMarketSalary(`${title} ${description}`, null);
  const avg = evalResult.avgPln;
  
  // Heuristic adjustments based on keywords
  let multiplier = 1.0;
  const combined = `${title} ${description}`.toLowerCase();
  
  if (combined.includes('kierownik') || combined.includes('inżynier') || combined.includes('mistrz')) multiplier += 0.25;
  if (combined.includes('samodzielny') || combined.includes('doświadczony') || combined.includes('brygadzista')) multiplier += 0.15;
  if (combined.includes('pomocnik') || combined.includes('uczeń') || combined.includes('bez doświadczenia')) multiplier -= 0.20;
  if (combined.includes('wyjazd') || combined.includes('delegacja') || combined.includes('niemcy')) multiplier += 0.30;
  
  const estimatedAvg = Math.round(avg * multiplier);
  const minPln = Math.round(estimatedAvg * 0.88 / 100) * 100;
  const maxPln = Math.round(estimatedAvg * 1.15 / 100) * 100;
  
  return {
    minPln,
    maxPln,
    text: `Estymacja AI: ~${minPln.toLocaleString('pl-PL')} - ${maxPln.toLocaleString('pl-PL')} zł/msc`
  };
}

