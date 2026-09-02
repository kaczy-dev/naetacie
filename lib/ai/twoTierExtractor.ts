/**
 * Two-Tier Hybrid AI Job Extraction Engine.
 * 
 * Tier 1: Zero-latency deterministic Regex & heuristics (handles 80%+ of offers at 0ms and $0).
 * Tier 2: LLM JSON Schema structured extractor (resolves ambiguous, slang, and complex job postings).
 */

import { extractJobTraits, extractPhoneNumber, ExtractedJobTraits } from './freeJobExtractor';
import { extractRequirements, ExtractedRequirement } from './extractor';
import { parseCleanPrice } from '@/functions/src/scraper/extractor';

export interface EnrichedJobData {
  title: string;
  description: string;
  price: number | null;
  salaryParsed: ExtractedJobTraits['salary_parsed'];
  phone: string | null;
  employmentType: string;
  certifications: string[];
  benefits: string[];
  requirements: ExtractedRequirement[];
  isFraudSuspicious: boolean;
  tierUsed: 'tier1_fast_regex' | 'tier2_structured_llm';
  confidenceScore: number; // 0.0 to 1.0
}

export interface LlmExtractorFn {
  (prompt: string): Promise<{
    salaryMin?: number;
    salaryMax?: number;
    salaryUnit?: 'hourly' | 'monthly' | 'project';
    employmentType?: string;
    certifications?: string[];
    benefits?: string[];
    phone?: string;
  } | null>;
}

/**
 * Evaluates completeness and confidence of fast-path extraction.
 */
function calculateTier1Confidence(traits: ExtractedJobTraits, price: number | null, phone: string | null): number {
  let score = 0.5;

  if (price !== null || traits.salary_parsed !== null) score += 0.2;
  if (phone !== null) score += 0.15;
  if (traits.certifications.length > 0) score += 0.1;
  if (traits.benefits.length > 0) score += 0.05;

  return Math.min(1.0, score);
}

/**
 * Slang & colloquial construction phrase detector for Polish ads.
 */
function containsConstructionSlang(text: string): boolean {
  const slangRx = /na\s+(?:rękę|czysto|czarno)|dyszek|piątka|do\s+łapy|fucha|regipsy|flizy|szpachla|robota\s+od\s+zaraz/i;
  return slangRx.test(text);
}

/**
 * Master Two-Tier Extraction Coordinator.
 */
export async function extractEnrichedJobData(
  title: string,
  description: string,
  rawPrice?: string | number | null,
  llmFallback?: LlmExtractorFn
): Promise<EnrichedJobData> {
  const fullText = `${title} ${description}`;
  const fastPrice = typeof rawPrice === 'number' ? rawPrice : parseCleanPrice(String(rawPrice || ''));
  const fastPhone = extractPhoneNumber(fullText);
  const fastTraits = extractJobTraits(title, description, rawPrice, fastPhone);
  const fastBadges = extractRequirements(title, description);

  const confidence = calculateTier1Confidence(fastTraits, fastPrice, fastPhone);
  const isSlangHeavy = containsConstructionSlang(fullText);

  // If Fast Path has high confidence and no complex slang requiring LLM
  if (confidence >= 0.75 && !isSlangHeavy || !llmFallback) {
    return {
      title,
      description,
      price: fastPrice,
      salaryParsed: fastTraits.salary_parsed,
      phone: fastPhone,
      employmentType: fastTraits.employment_type_normalized,
      certifications: fastTraits.certifications,
      benefits: fastTraits.benefits,
      requirements: fastBadges,
      isFraudSuspicious: fastTraits.fraud_analysis.isSuspicious,
      tierUsed: 'tier1_fast_regex',
      confidenceScore: confidence,
    };
  }

  // Tier 2: LLM Structured Fallback for complex/slang-heavy descriptions
  try {
    const llmResult = await llmFallback(
      `Przeanalizuj ofertę budowlaną: "${title}"\nTreść: "${description}"`
    );

    if (llmResult) {
      const mergedSalary = llmResult.salaryMin
        ? {
            min: llmResult.salaryMin,
            max: llmResult.salaryMax || llmResult.salaryMin,
            currency: 'PLN',
            unit: llmResult.salaryUnit || 'monthly',
          }
        : fastTraits.salary_parsed;

      return {
        title,
        description,
        price: fastPrice || (llmResult.salaryMin ?? null),
        salaryParsed: mergedSalary,
        phone: fastPhone || llmResult.phone || null,
        employmentType: llmResult.employmentType || fastTraits.employment_type_normalized,
        certifications: Array.from(new Set([...fastTraits.certifications, ...(llmResult.certifications || [])])),
        benefits: Array.from(new Set([...fastTraits.benefits, ...(llmResult.benefits || [])])),
        requirements: fastBadges,
        isFraudSuspicious: fastTraits.fraud_analysis.isSuspicious,
        tierUsed: 'tier2_structured_llm',
        confidenceScore: 0.95,
      };
    }
  } catch {
    /* fallback to Tier 1 on LLM error */
  }

  return {
    title,
    description,
    price: fastPrice,
    salaryParsed: fastTraits.salary_parsed,
    phone: fastPhone,
    employmentType: fastTraits.employment_type_normalized,
    certifications: fastTraits.certifications,
    benefits: fastTraits.benefits,
    requirements: fastBadges,
    isFraudSuspicious: fastTraits.fraud_analysis.isSuspicious,
    tierUsed: 'tier1_fast_regex',
    confidenceScore: confidence,
  };
}
