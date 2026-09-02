import { describe, it, expect } from 'vitest';
import { validatePolishNip, formatNip, lookupGusCompany } from '@/lib/billing/gusVatLookup';

describe('GUS & NIP Validation Unit Tests', () => {
  describe('validatePolishNip', () => {
    it('accepts valid Polish NIPs with correct modulo 11 checksum', () => {
      expect(validatePolishNip('8510000003').isValid).toBe(true);
      expect(validatePolishNip('852-000-00-16').isValid).toBe(true);
      expect(validatePolishNip('8513254477').isValid).toBe(true);
    });

    it('rejects NIP with incorrect checksum', () => {
      expect(validatePolishNip('8510000004').isValid).toBe(false);
      expect(validatePolishNip('1234567890').isValid).toBe(false);
    });

    it('rejects NIP with invalid length or non-digits', () => {
      expect(validatePolishNip('85110055').isValid).toBe(false);
      expect(validatePolishNip('851100552299').isValid).toBe(false);
      expect(validatePolishNip(null).isValid).toBe(false);
    });
  });

  describe('formatNip', () => {
    it('formats 10-digit NIP into 123-456-78-90 grouped standard', () => {
      expect(formatNip('8510000003')).toBe('851-000-00-03');
      expect(formatNip('8520000016')).toBe('852-000-00-16');
    });
  });

  describe('lookupGusCompany', () => {
    it('returns known Szczecin construction company data', async () => {
      const company = await lookupGusCompany('8510000003');
      expect(company).not.toBeNull();
      expect(company?.companyName).toContain('BUDMAX SZCZECIN');
      expect(company?.city).toBe('Szczecin');
      expect(company?.isVatActive).toBe(true);
    });

    it('returns null for invalid NIP during lookup', async () => {
      const company = await lookupGusCompany('0000000000');
      expect(company).toBeNull();
    });
  });
});
