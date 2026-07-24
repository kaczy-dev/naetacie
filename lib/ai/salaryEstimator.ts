/**
 * AI-powered Salary Estimator.
 * Predicts estimated gross and net salary ranges for job announcements
 * where price is unlisted or negotiated ("Cena do uzgodnienia").
 */

export interface SalaryEstimate {
  minGross: number;
  maxGross: number;
  avgGross: number;
  estimatedNet: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

interface CategoryBenchmark {
  baseMin: number;
  baseMax: number;
}

const CATEGORY_BENCHMARKS: Record<string, CategoryBenchmark> = {
  budowa: { baseMin: 5500, baseMax: 9000 },
  instalacje: { baseMin: 6500, baseMax: 10500 },
  wykończenia: { baseMin: 5800, baseMax: 9500 },
  ogólne: { baseMin: 5000, baseMax: 8000 },
};

/**
 * Predicts salary range for an announcement.
 */
export function estimateSalary(
  category: string,
  title: string,
  description: string
): SalaryEstimate {
  const normCat = (category || 'ogólne').toLowerCase();
  const benchmark = CATEGORY_BENCHMARKS[normCat] || CATEGORY_BENCHMARKS.ogólne;

  let minMultiplier = 1.0;
  let maxMultiplier = 1.0;
  const reasons: string[] = [`Rynek regionalny: Szczecin i okolice (${normCat})`];

  const text = `${title} ${description}`.toLowerCase();

  if (/kierownik|inżynier|majster|koordynator/i.test(text)) {
    minMultiplier *= 1.4;
    maxMultiplier *= 1.6;
    reasons.push('+ Stanowisko kierownicze / inżynieryjne');
  } else if (/operator|spawacz|cieśla|zbrojarz|elektryk|dekarz/i.test(text)) {
    minMultiplier *= 1.15;
    maxMultiplier *= 1.25;
    reasons.push('+ Wykwalifikowany fachowiec / specjalista');
  } else if (/pomocnik|przyuczeni/i.test(text)) {
    minMultiplier *= 0.85;
    maxMultiplier *= 0.9;
    reasons.push('- Stanowisko pomocnicze');
  }

  if (/sep|f-gaz|uprawnienia|certyfikat/i.test(text)) {
    maxMultiplier *= 1.1;
    reasons.push('+ Wymagane certyfikaty / uprawnienia');
  }

  const minGross = Math.round((benchmark.baseMin * minMultiplier) / 100) * 100;
  const maxGross = Math.round((benchmark.baseMax * maxMultiplier) / 100) * 100;
  const avgGross = Math.round((minGross + maxGross) / 2 / 100) * 100;
  const estimatedNet = Math.round(avgGross * 0.72); // ~72% for standard UoP net

  return {
    minGross,
    maxGross,
    avgGross,
    estimatedNet,
    confidence: text.length > 50 ? 'high' : 'medium',
    reasons,
  };
}
