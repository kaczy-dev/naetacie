import { describe, it, expect, vi } from 'vitest';
import {
  formatTelegramJobAlert,
  doesAdMatchSubscription,
  dispatchTelegramAlert,
  type TelegramAlertPayload,
  type UserAlertSubscription,
} from '@/lib/alerts/instantAlertDispatcher';

describe('Instant Alert Dispatcher & Telegram Webhook Suite', () => {
  const sampleAd: TelegramAlertPayload = {
    adId: 'olx-108H31',
    title: 'Monter Konstrukcji Stalowych',
    price: 45,
    locationText: 'Szczecin, Prawobrzeże',
    sourcePortal: 'olx',
    phone: '501234567',
    directUrl: 'https://www.olx.pl/d/oferta/monter-ID108H31.html',
    category: 'budowa',
    requirements: ['Uprawnienia spawalnicze', 'Rysunek techniczny'],
  };

  describe('formatTelegramJobAlert', () => {
    it('formats high-conversion markdown message with action buttons', () => {
      const formatted = formatTelegramJobAlert(sampleAd);

      expect(formatted.text).toContain('NOWE ZLECENIE');
      expect(formatted.text).toContain('45 zł');
      expect(formatted.inlineKeyboard.length).toBeGreaterThanOrEqual(2);
      expect(formatted.inlineKeyboard[0][0].text).toContain('Zobacz na OLX');
      expect(formatted.inlineKeyboard[1][0].text).toBe('💬 Aplikuj SMS');
      expect(formatted.inlineKeyboard[1][1].text).toBe('📲 WhatsApp');
    });
  });

  describe('doesAdMatchSubscription', () => {
    it('matches ads meeting category, price, and keyword criteria', () => {
      const sub: UserAlertSubscription = {
        userId: 'user_1',
        categories: ['budowa'],
        minPrice: 40,
        keywords: ['monter'],
        portalFilters: ['olx'],
      };

      expect(doesAdMatchSubscription(sampleAd, sub)).toBe(true);
    });

    it('rejects ads when price or keywords do not match', () => {
      const subHighPrice: UserAlertSubscription = {
        userId: 'user_2',
        minPrice: 80, // Ad has 45
      };
      expect(doesAdMatchSubscription(sampleAd, subHighPrice)).toBe(false);

      const subDifferentKeyword: UserAlertSubscription = {
        userId: 'user_3',
        keywords: ['elektryk'], // Ad is monter
      };
      expect(doesAdMatchSubscription(sampleAd, subDifferentKeyword)).toBe(false);
    });
  });

  describe('dispatchTelegramAlert', () => {
    it('sends POST request to Telegram Bot API with payload', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

      const success = await dispatchTelegramAlert(
        '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        '987654321',
        sampleAd,
        mockFetch as any
      );

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sendMessage'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });
});
