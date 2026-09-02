import { describe, it, expect } from 'vitest';
import { parseNaturalLanguageQuery } from '@/lib/search/naturalLanguageQuery';
import { playSalaryChime } from '@/lib/motion/soundEngine';

describe('Ultra-Tier Mobile-First UI/UX & Natural Language Engine', () => {
  describe('Natural Language Query Parser (Polish Trade Intent)', () => {
    it('parses freeform trade query with district, urgency, and salary', () => {
      const query = 'glazurnik centrum zaraz za min 8000 na b2b';
      const parsed = parseNaturalLanguageQuery(query);

      expect(parsed.district).toBe('Śródmieście');
      expect(parsed.isUrgent).toBe(true);
      expect(parsed.minSalary).toBe(8000);
      expect(parsed.employmentType).toBe('B2B');
      expect(parsed.matchedCategory).toBe('wykończenia');
    });

    it('parses abbreviated numbers like 9k and UoP', () => {
      const query = 'hydraulik warszewo od 9k uop';
      const parsed = parseNaturalLanguageQuery(query);

      expect(parsed.district).toBe('Warszewo');
      expect(parsed.minSalary).toBe(9000);
      expect(parsed.employmentType).toBe('Umowa o pracę');
      expect(parsed.matchedCategory).toBe('instalacje');
    });

    it('handles empty query gracefully', () => {
      const parsed = parseNaturalLanguageQuery('');
      expect(parsed.district).toBeNull();
      expect(parsed.minSalary).toBeNull();
      expect(parsed.isUrgent).toBe(false);
    });
  });

  describe('Salary Pitch Harmonic Synthesizer', () => {
    it('plays salary-dependent chimes without throwing', () => {
      expect(() => playSalaryChime(4500)).not.toThrow();
      expect(() => playSalaryChime(7500)).not.toThrow();
      expect(() => playSalaryChime(11000)).not.toThrow();
      expect(() => playSalaryChime(16000)).not.toThrow();
      expect(() => playSalaryChime('12 000 zł')).not.toThrow();
      expect(() => playSalaryChime(null)).not.toThrow();
    });
  });
});
