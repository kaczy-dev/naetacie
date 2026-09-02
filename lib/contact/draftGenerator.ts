/**
 * High-Conversion Auto-Pitch & Message Generator for SMS and WhatsApp.
 * Senior Polish Trade Architecture for NaEtacie.
 * Generates tailored Polish job and subcontracting application drafts for construction & renovation offers.
 */

export type PitchTone = 'quick' | 'direct' | 'professional' | 'subcontractor' | 'rate_pitch' | 'formal';

export interface DraftOptions {
  phone?: string | null;
  title: string;
  location?: string | null;
  applicantName?: string;
  yearsExperience?: number | string;
  applicantSkills?: string[];
  equipmentList?: string[];
  certifications?: string[];
  availability?: string;
  teamSize?: number;
  isInvoiceAvailable?: boolean;
  proposedRate?: number | string;
  tone?: PitchTone;
  sourcePortal?: string;
}

export interface MessageDraft {
  phone: string;
  formattedPhone: string;
  smsUrl: string;
  whatsAppUrl: string;
  text: string;
  characterCount: number;
  smsPartsCount: number;
}

/**
 * Formats a clean Polish phone number for display (+48 501 234 567 -> 501 234 567)
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const clean = digits.startsWith('48') && digits.length === 11 ? digits.slice(2) : digits;
  if (clean.length === 9) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return phone;
}

/**
 * Normalizes phone number into international E.164 format (+48...)
 */
export function normalizeE164Phone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('48') && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.length === 9) {
    return `+48${digits}`;
  }
  return phone.startsWith('+') ? phone : `+${digits}`;
}

/**
 * Generates a targeted, high-conversion Polish message draft for SMS / WhatsApp.
 */
export function generateApplicationMessageDraft(
  phoneOrOptions: string | null | undefined | DraftOptions,
  legacyTitle?: string,
  legacySourcePortal?: string
): MessageDraft | null {
  let opts: DraftOptions;

  if (typeof phoneOrOptions === 'object' && phoneOrOptions !== null) {
    opts = phoneOrOptions;
  } else {
    opts = {
      phone: phoneOrOptions,
      title: legacyTitle || 'ogłoszenie',
      sourcePortal: legacySourcePortal,
    };
  }

  if (!opts.phone) return null;

  const rawPhone = opts.phone.trim();
  const e164 = normalizeE164Phone(rawPhone);
  const cleanDigits = e164.replace(/\D/g, '');
  if (!cleanDigits || cleanDigits.length < 9) return null;

  const portal = opts.sourcePortal ? opts.sourcePortal.toUpperCase() : 'OLX';
  const nameSign = opts.applicantName?.trim() ? ` Pozdrawiam, ${opts.applicantName.trim()}.` : ' Pozdrawiam.';
  const locText = opts.location ? ` w ${opts.location}` : '';
  const availText = opts.availability ? ` (${opts.availability})` : ' od zaraz';

  const tone = opts.tone || 'quick';
  let text = '';

  if (tone === 'quick' || tone === 'direct') {
    // ⚡ Szybki majster / natychmiastowy start
    text = `Dzień dobry, piszę w sprawie ogłoszenia "${opts.title}"${locText} na portalu ${portal}. Jestem dostępny${availText}, posiadam doświadczenie. Czy oferta jest nadal aktualna?${nameSign}`;
  } else if (tone === 'professional') {
    // 🛠️ Doświadczony fachowiec ze sprzętem i uprawnieniami
    const expText = opts.yearsExperience ? ` Posiadam ${opts.yearsExperience} lat doświadczenia.` : ' Posiadam wieloletnie doświadczenie.';
    const certsText = opts.certifications && opts.certifications.length > 0 ? ` Uprawnienia: ${opts.certifications.join(', ')}.` : '';
    const equipText = opts.equipmentList && opts.equipmentList.length > 0 ? ` Własny profesjonalny sprzęt: ${opts.equipmentList.join(', ')}.` : ' Dysponuję własnym sprzętem i autem.';
    text = `Dzień dobry. Piszę w odpowiedzi na ofertę "${opts.title}" (${portal}).${expText}${certsText}${equipText} Mogę rozpocząć${availText}. Kiedy można omówić szczegóły?${nameSign}`;
  } else if (tone === 'subcontractor') {
    // 🏗️ Ekipa / Podwykonawca B2B
    const team = opts.teamSize && opts.teamSize > 1 ? `${opts.teamSize}-osobową` : 'sprawdzoną';
    const invoice = opts.isInvoiceAvailable ? ' Wystawiamy fakturę VAT.' : '';
    text = `Dzień dobry, reprezentuję ${team} ekipę budowlaną ze Szczecina. Chętnie podejmiemy realizację zlecenia "${opts.title}" (${portal}). Dostępność:${availText}.${invoice} Proszę o kontakt telefoniczny.${nameSign}`;
  } else if (tone === 'rate_pitch') {
    // 💰 Konkretna stawka / oferta cenowa
    const rateStr = opts.proposedRate ? ` Moja propozycja stawki to: ${opts.proposedRate} zł.` : '';
    text = `Dzień dobry, w sprawie ogłoszenia "${opts.title}" (${portal}).${rateStr} Prace wykonuję solidnie i terminowo, z gwarancją. Dostępność${availText}. Czy możemy omówić szczegóły?${nameSign}`;
  } else {
    // 👔 Formalny
    const skillsText = opts.applicantSkills && opts.applicantSkills.length > 0 ? ` Moje umiejętności: ${opts.applicantSkills.join(', ')}.` : '';
    text = `Dzień dobry. Chciałbym zgłosić swoją kandydaturę na stanowisko "${opts.title}" (${portal}).${skillsText} Chętnie przedstawię swoje doświadczenie podczas rozmowy.${nameSign}`;
  }

  const charCount = text.length;
  // Standard GSM SMS is 160 chars for 1 part, or 153 chars for multi-part (approximate for Polish chars)
  const smsParts = Math.max(1, Math.ceil(charCount / 153));

  const encodedText = encodeURIComponent(text);
  const smsUrl = `sms:${e164}?body=${encodedText}`;
  const whatsAppUrl = `https://wa.me/${cleanDigits}?text=${encodedText}`;

  return {
    phone: e164,
    formattedPhone: formatPhoneNumber(rawPhone),
    smsUrl,
    whatsAppUrl,
    text,
    characterCount: charCount,
    smsPartsCount: smsParts,
  };
}
