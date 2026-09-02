import { describe, it, expect } from 'vitest';
import {
  generateApplicationMessageDraft,
  formatPhoneNumber,
  normalizeE164Phone,
} from '@/lib/contact/draftGenerator';

describe('High-Conversion Contact Pitch & Draft Generator', () => {
  describe('normalizeE164Phone & formatPhoneNumber', () => {
    it('normalizes 9-digit Polish phone numbers to E.164 (+48)', () => {
      expect(normalizeE164Phone('501234567')).toBe('+48501234567');
      expect(normalizeE164Phone('+48 600 700 800')).toBe('+48600700800');
      expect(normalizeE164Phone('48-791-222-333')).toBe('+48791222333');
    });

    it('formats numbers nicely with spaces for UI display', () => {
      expect(formatPhoneNumber('+48501234567')).toBe('501 234 567');
      expect(formatPhoneNumber('600700800')).toBe('600 700 800');
    });
  });

  describe('generateApplicationMessageDraft', () => {
    it('returns null when phone number is missing or invalid', () => {
      expect(generateApplicationMessageDraft(null, 'Dekarz')).toBeNull();
      expect(generateApplicationMessageDraft('', 'Dekarz')).toBeNull();
      expect(generateApplicationMessageDraft('123', 'Dekarz')).toBeNull();
    });

    it('generates quick tone SMS & WhatsApp links with pre-filled Polish content', () => {
      const draft = generateApplicationMessageDraft({
        phone: '501234567',
        title: 'Monter Płyt G-K',
        location: 'Szczecin Gumieńce',
        applicantName: 'Marek',
        tone: 'quick',
        sourcePortal: 'olx',
      });

      expect(draft).not.toBeNull();
      if (draft) {
        expect(draft.phone).toBe('+48501234567');
        expect(draft.formattedPhone).toBe('501 234 567');
        expect(draft.text).toContain('Monter Płyt G-K');
        expect(draft.text).toContain('Szczecin Gumieńce');
        expect(draft.text).toContain('Marek');
        expect(draft.smsUrl).toContain('sms:+48501234567?body=');
        expect(draft.whatsAppUrl).toContain('https://wa.me/48501234567?text=');
        expect(draft.characterCount).toBeGreaterThan(0);
        expect(draft.smsPartsCount).toBeGreaterThanOrEqual(1);
      }
    });

    it('supports professional tone with equipment and certifications', () => {
      const draft = generateApplicationMessageDraft({
        phone: '501234567',
        title: 'Elektryk Budowlany',
        yearsExperience: 8,
        certifications: ['SEP E+D', 'Prawo jazdy B'],
        equipmentList: ['Mierniki Sonel', 'Bruzdownica'],
        tone: 'professional',
      });

      expect(draft?.text).toContain('8 lat doświadczenia');
      expect(draft?.text).toContain('SEP E+D, Prawo jazdy B');
      expect(draft?.text).toContain('Mierniki Sonel, Bruzdownica');
    });

    it('supports subcontractor B2B tone with team size and VAT invoice flag', () => {
      const draft = generateApplicationMessageDraft({
        phone: '501234567',
        title: 'Szpachlowanie natryskowe',
        teamSize: 4,
        isInvoiceAvailable: true,
        tone: 'subcontractor',
      });

      expect(draft?.text).toContain('4-osobową ekipę budowlaną');
      expect(draft?.text).toContain('Wystawiamy fakturę VAT');
    });

    it('supports rate_pitch tone with custom rate', () => {
      const draft = generateApplicationMessageDraft({
        phone: '501234567',
        title: 'Kafelkowanie łazienek',
        proposedRate: '95 zł/m2',
        tone: 'rate_pitch',
      });

      expect(draft?.text).toContain('Moja propozycja stawki to: 95 zł/m2');
      expect(draft?.text).toContain('gwarancją');
    });
  });
});
