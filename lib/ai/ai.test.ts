import { describe, it, expect } from 'vitest';
import { extractRequirements } from './extractor';
import { estimateSalary } from './salaryEstimator';
import { generateCoverLetter } from './coverLetter';

describe('AI Modules Test Suite', () => {
  describe('extractRequirements', () => {
    it('extracts SEP and Prawo jazdy requirements from text', () => {
      const title = 'Elektryk budowlany - SEP i prawo jazdy kat. B';
      const desc = 'Wymagane uprawnienia SEP do 1kV oraz własne narzędzia.';
      const reqs = extractRequirements(title, desc);

      const ids = reqs.map((r) => r.id);
      expect(ids).toContain('sep');
      expect(ids).toContain('driver');
      expect(ids).toContain('tools');
    });

    it('returns empty array if no known requirements matched', () => {
      const reqs = extractRequirements('Inna praca', 'Brak szczegółów.');
      expect(reqs).toEqual([]);
    });
  });

  describe('estimateSalary', () => {
    it('estimates higher salary for management positions', () => {
      const estimate = estimateSalary('budowa', 'Kierownik Budowy', 'Nadzór nad budową osiedla');
      expect(estimate.minGross).toBeGreaterThan(6000);
      expect(estimate.reasons.length).toBeGreaterThan(0);
    });

    it('estimates valid range for unlisted salary', () => {
      const estimate = estimateSalary('instalacje', 'Hydraulik', 'Montaż instalacji CO');
      expect(estimate.minGross).toBeGreaterThan(0);
      expect(estimate.maxGross).toBeGreaterThan(estimate.minGross);
      expect(estimate.estimatedNet).toBeGreaterThan(0);
    });
  });

  describe('generateCoverLetter', () => {
    it('generates formal cover letter text', () => {
      const text = generateCoverLetter({
        jobTitle: 'Murarz',
        companyName: 'BudMax',
        locationText: 'Szczecin',
        sourcePortal: 'olx',
        applicantName: 'Jan Kowalski',
        applicantPhone: '500123456',
        tone: 'formal',
      });

      expect(text).toContain('Murarz');
      expect(text).toContain('BudMax');
      expect(text).toContain('Jan Kowalski');
      expect(text).toContain('500123456');
    });

    it('generates direct quick message text', () => {
      const text = generateCoverLetter({
        jobTitle: 'Malarz',
        locationText: 'Police',
        sourcePortal: 'fixly',
        tone: 'direct',
      });

      expect(text).toContain('Malarz');
      expect(text).toContain('Police');
      expect(text).toContain('FIXLY');
    });
  });
});
