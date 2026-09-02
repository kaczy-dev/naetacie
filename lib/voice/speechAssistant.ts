/**
 * Voice Speech Assistant & Audio Summarizer (PL / UA).
 * 
 * Uses Web Speech API (speechSynthesis) to deliver high-speed 5-second audio summaries
 * of job listings for tradesmen on construction sites or driving.
 */

export interface SpeechJobData {
  title: string;
  location: string;
  price?: string | number | null;
  category?: string | null;
  phone?: string | null;
  description?: string | null;
}

export function generateVoiceSummaryText(data: SpeechJobData, lang: 'pl' | 'uk' = 'pl'): string {
  const { title, location, price, phone } = data;

  const cleanPrice = typeof price === 'number' ? `${price} złotych` : price || 'Stawka do uzgodnienia';
  const cleanPhone = phone ? phone.replace(/[^\d]/g, ' ').trim() : 'Brak bezpośredniego telefonu';

  if (lang === 'uk') {
    return `Вакансія: ${title}. Локація: ${location}. Оплата: ${cleanPrice}. Телефон для зв'язку: ${cleanPhone}.`;
  }

  return `Zlecenie: ${title}. Lokalizacja: ${location}. Wynagrodzenie: ${cleanPrice}. Kontakt: ${cleanPhone}.`;
}

export class VoiceSpeechService {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public static speak(text: string, lang: 'pl' | 'uk' = 'pl', onEnd?: () => void): void {
    if (!this.synth) return;

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'uk' ? 'uk-UA' : 'pl-PL';
    utterance.rate = 1.05; // slightly faster for quick listening
    utterance.pitch = 1.0;

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public static stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public static isSpeaking(): boolean {
    return Boolean(this.synth?.speaking);
  }
}
