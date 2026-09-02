import { describe, it, expect } from 'vitest';
import { generateInvoiceNumber, generateVatInvoice, PLATFORM_SELLER_DATA } from '@/lib/billing/invoiceGenerator';
import { initiateBlikTransaction } from '@/lib/billing/blikEngine';
import { lookupGusCompany } from '@/lib/billing/gusVatLookup';

describe('VAT Invoice Generator Unit Tests', () => {
  describe('generateInvoiceNumber', () => {
    it('formats sequential invoice number in Polish format FV/YYYY/MM/NNN', () => {
      const fixedDate = new Date('2026-08-25T12:00:00Z');
      const invoiceNumber = generateInvoiceNumber(fixedDate, 42);
      expect(invoiceNumber).toBe('FV/2026/08/042');
    });
  });

  describe('generateVatInvoice', () => {
    it('builds complete structured B2B invoice with 23% VAT math and seller info', async () => {
      const init = initiateBlikTransaction({
        productId: 'PRO_MONTHLY_SUB',
        blikCode: '123456',
        buyerEmail: 'biuro@budmax.szczecin.pl',
      });

      const company = await lookupGusCompany('8510000003');
      const invoice = generateVatInvoice(init.transaction!, company, 1);

      expect(invoice.isPaid).toBe(true);
      expect(invoice.seller.nip).toBe(PLATFORM_SELLER_DATA.nip);
      expect(invoice.buyer.name).toContain('BUDMAX SZCZECIN');
      expect(invoice.totals.grossPln).toBe(79.00);
      expect(invoice.totals.netPln).toBe(64.23);
      expect(invoice.totals.vatPln).toBe(14.77);
      expect(invoice.items[0].name).toBe('Abonament Majster PRO');
    });
  });
});
