import { describe, it, expect } from 'vitest';
import {
  validateBlikCode,
  calculateVatBreakdown,
  initiateBlikTransaction,
  simulateBankAuthorization,
  MONETIZATION_PRODUCTS,
} from '@/lib/billing/blikEngine';

describe('BLIK & Monetization Engine Unit Tests', () => {
  describe('validateBlikCode', () => {
    it('accepts valid 6-digit BLIK codes', () => {
      expect(validateBlikCode('123456').isValid).toBe(true);
      expect(validateBlikCode('789012').isValid).toBe(true);
      expect(validateBlikCode('501234').isValid).toBe(true);
    });

    it('rejects codes with wrong lengths', () => {
      expect(validateBlikCode('12345').isValid).toBe(false);
      expect(validateBlikCode('1234567').isValid).toBe(false);
      expect(validateBlikCode('').isValid).toBe(false);
    });

    it('rejects trivial repetitive codes like 000000 or 111111', () => {
      expect(validateBlikCode('000000').isValid).toBe(false);
      expect(validateBlikCode('111111').isValid).toBe(false);
      expect(validateBlikCode('999999').isValid).toBe(false);
    });
  });

  describe('calculateVatBreakdown', () => {
    it('accurately computes 23% VAT and Net value for 79.00 zł', () => {
      const breakdown = calculateVatBreakdown(79.00, 23);
      expect(breakdown.grossPln).toBe(79.00);
      expect(breakdown.netPln).toBe(64.23);
      expect(breakdown.vatPln).toBe(14.77);
      expect(breakdown.formattedGross).toBe('79.00 zł');
    });

    it('accurately computes 23% VAT for 19.00 zł ad boost', () => {
      const breakdown = calculateVatBreakdown(19.00, 23);
      expect(breakdown.grossPln).toBe(19.00);
      expect(breakdown.netPln).toBe(15.45);
      expect(breakdown.vatPln).toBe(3.55);
    });
  });

  describe('initiateBlikTransaction', () => {
    it('creates active waiting transaction session for valid BLIK code', () => {
      const result = initiateBlikTransaction({
        productId: 'PRO_MONTHLY_SUB',
        blikCode: '654321',
        buyerEmail: 'majster@szczecin.pl',
      });

      expect(result.error).toBeUndefined();
      expect(result.transaction).not.toBeNull();
      expect(result.transaction?.status).toBe('WAITING_FOR_BANK_CONFIRMATION');
      expect(result.transaction?.amountGross).toBe(79.00);
      expect(result.transaction?.transactionId).toContain('TXN_BLIK');
    });

    it('returns error for invalid BLIK code during initiation', () => {
      const result = initiateBlikTransaction({
        productId: 'PRO_MONTHLY_SUB',
        blikCode: '123',
      });

      expect(result.transaction).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('simulateBankAuthorization', () => {
    it('authorizes transaction successfully in test flow', async () => {
      const init = initiateBlikTransaction({
        productId: 'BOOST_AD_3D',
        blikCode: '778899',
      });

      const authorized = await simulateBankAuthorization(init.transaction!, 50);
      expect(authorized.status).toBe('AUTHORIZED');
      expect(authorized.authorizedAt).toBeInstanceOf(Date);
    });

    it('simulates bank rejection when code ends in 00', async () => {
      const init = initiateBlikTransaction({
        productId: 'BOOST_AD_3D',
        blikCode: '778800',
      });

      const rejected = await simulateBankAuthorization(init.transaction!, 50);
      expect(rejected.status).toBe('REJECTED');
    });
  });
});
