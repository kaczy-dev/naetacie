import { describe, it, expect } from 'vitest';
import {
  inferTradeAndScope,
  calculateTradeBid,
  SZCZECIN_TRADE_BENCHMARKS,
} from '@/lib/calculator/tradeBidEstimator';

describe('Trade Bid Estimator Suite', () => {
  it('infers trade and square meter scope from title and description', () => {
    const title = 'Zlecę położenie gładzi i malowanie';
    const desc = 'Mieszkanie 80 m2 w Szczecinie na Pogodnie. Ściany przygotowane.';

    const { tradeKey, scope } = inferTradeAndScope(title, desc);
    expect(tradeKey).toBe('gladzie_malowanie');
    expect(scope.quantity).toBe(80);
    expect(scope.unit).toBe('m²');
  });

  it('infers electrical points scope correctly', () => {
    const title = 'Instalacja elektryczna domek Police';
    const desc = 'Do zrobienia ok. 45 punktów elektrycznych wraz z rozdzielnicą.';

    const { tradeKey, scope } = inferTradeAndScope(title, desc);
    expect(tradeKey).toBe('elektryka_punkty');
    expect(scope.quantity).toBe(45);
    expect(scope.unit).toBe('pkt');
  });

  it('calculates labor range and auto-generates SMS / WhatsApp quotation', () => {
    const estimation = calculateTradeBid('glazura_plytki', 30, true);

    expect(estimation.tradeName).toContain('płytek');
    expect(estimation.scopeQuantity).toBe(30);
    expect(estimation.scopeUnit).toBe('m²');
    expect(estimation.laborAvgPLN).toBe(30 * SZCZECIN_TRADE_BENCHMARKS.glazura_plytki.avgRatePLN);
    expect(estimation.laborMinPLN).toBeLessThan(estimation.laborAvgPLN);
    expect(estimation.materialsEstimatedPLN).toBeGreaterThan(0);
    expect(estimation.quotationDraftSms).toContain('Szacunkowa wycena robocizny');
    expect(estimation.quotationDraftWhatsApp).toContain('wizję lokalną');
  });
});
