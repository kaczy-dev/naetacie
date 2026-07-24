/**
 * AI Cover Letter & Quick Application Message Generator.
 * Generates personalized application text tailored to a specific job posting.
 */

export interface CoverLetterOptions {
  jobTitle: string;
  companyName?: string | null;
  locationText: string;
  sourcePortal: string;
  applicantName?: string;
  applicantPhone?: string;
  applicantSkills?: string;
  yearsOfExperience?: string;
  tone?: 'formal' | 'direct' | 'enthusiastic';
}

export function generateCoverLetter(options: CoverLetterOptions): string {
  const name = options.applicantName?.trim() || '[Twoje Imię i Nazwisko]';
  const phone = options.applicantPhone?.trim() || '[Twój Numer Telefonu]';
  const skills = options.applicantSkills?.trim() || 'doświadczenie w pracach budowlano-montażowych oraz sumienność i punktualność';
  const exp = options.yearsOfExperience?.trim() || 'kilkuletnie';
  const company = options.companyName?.trim() ? options.companyName.trim() : 'Zespołu';

  if (options.tone === 'direct') {
    return `Dzień dobry,

Piszę w sprawie ogłoszenia na stanowisko "${options.jobTitle}" (${options.locationText}) opublikowanego na portalu ${options.sourcePortal.toUpperCase()}.

Posiadam ${exp} doświadczenie w branży, a moimi głównymi zaletami są: ${skills}. Jestem gotów do podjęcia pracy od zaraz.

Proszę o kontakt telefoniczny pod numerem ${phone} w celu omówienia szczegółów współpracy.

Z poważaniem,
${name}`;
  }

  return `Szanowni Państwo / Zespole ${company},

Z wielkim zainteresowaniem zgłaszam swoją kandydaturę na stanowisko "${options.jobTitle}", zlokalizowane w: ${options.locationText}.

Moje doświadczenie zawodowe obejmuje ${exp} doświadczenia w realizacjach budowlanych i wykończeniowych. Do moich kluczowych kompetencji należą: ${skills}. Cenię sobie wysoką jakość wykonania, terminowość oraz przestrzeganie zasad BHP na placu budowy.

Chętnie przedstawię szczegóły mojego doświadczenia podczas rozmowy kwalifikacyjnej lub telefonicznej.

Kontakt:
📱 Telefon: ${phone}
📧 Imię i nazwisko: ${name}

Z poważaniem,
${name}`;
}
