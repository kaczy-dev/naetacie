/**
 * Auto-Draft Generator for SMS and WhatsApp.
 * Generates pre-filled, professional Polish job application messages for construction job offers.
 */

export interface MessageDraft {
  phone: string;
  smsUrl: string;
  whatsAppUrl: string;
  text: string;
}

export function generateApplicationMessageDraft(
  phone: string | null | undefined,
  title: string,
  sourcePortal?: string
): MessageDraft | null {
  if (!phone) return null;

  const cleanPhone = phone.replace(/[^\d+]/g, '');
  if (!cleanPhone) return null;

  const portal = sourcePortal || 'NaEtacie';
  const text = `Dzień dobry, piszę w sprawie ogłoszenia: "${title}" (źródło: ${portal}). Posiadam doświadczenie w branży. Czy oferta jest aktualna? Pozdrawiam.`;

  const encodedText = encodeURIComponent(text);
  const smsUrl = `sms:${cleanPhone}?body=${encodedText}`;
  const whatsAppUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  return {
    phone: cleanPhone,
    smsUrl,
    whatsAppUrl,
    text,
  };
}
