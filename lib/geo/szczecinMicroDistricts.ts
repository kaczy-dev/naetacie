/**
 * Comprehensive Szczecin Micro-Districts & Postal Code Resolution Catalog.
 * Contains official coordinates for all 37 Szczecin Municipal Osiedla and key landmark streets.
 * Resolves fuzzy location strings (e.g. "ul. Santocka", "71-450", "Jasne Błonia") to pinpoint coordinates.
 */

export interface SzczecinMicroDistrict {
  id: string;
  name: string;
  quarter: 'Północ' | 'Zachód' | 'Śródmieście' | 'Prawobrzeże';
  lat: number;
  lng: number;
  keywords: string[];
}

export const SZCZECIN_OSIEDLA: SzczecinMicroDistrict[] = [
  // Północ
  { id: 'warszewo', name: 'Warszewo', quarter: 'Północ', lat: 53.468, lng: 14.542, keywords: ['warszewo', 'warszewie', 'duńska', 'kresowa', 'podbórzańska'] },
  { id: 'osow', name: 'Osów', quarter: 'Północ', lat: 53.479, lng: 14.512, keywords: ['osów', 'osowie', 'miodowa'] },
  { id: 'bukowo', name: 'Bukowo', quarter: 'Północ', lat: 53.484, lng: 14.571, keywords: ['bukowo', 'bukowie', 'zagórskiego'] },
  { id: 'golecino_goclaw', name: 'Golęcino-Gocław', quarter: 'Północ', lat: 53.475, lng: 14.595, keywords: ['golęcino', 'gocław', 'strzałowska'] },
  { id: 'niebuszewo', name: 'Niebuszewo', quarter: 'Północ', lat: 53.447, lng: 14.551, keywords: ['niebuszewo', 'niebuszewie', 'krasińskiego', 'długosza', 'niemcewicza', 'orzeszkowej'] },
  { id: 'zelechowa', name: 'Żelechowa', quarter: 'Północ', lat: 53.458, lng: 14.578, keywords: ['żelechowa', 'zelechowa', 'obotrycka', 'studzienna'] },
  { id: 'skolwin', name: 'Skolwin', quarter: 'Północ', lat: 53.524, lng: 14.618, keywords: ['skolwin', 'skolwinie', 'stołczyńska'] },
  { id: 'stolczyn', name: 'Stołczyn', quarter: 'Północ', lat: 53.498, lng: 14.602, keywords: ['stołczyn', 'stolczyn', 'nad odrą'] },

  // Zachód
  { id: 'pogodno', name: 'Pogodno', quarter: 'Zachód', lat: 53.442, lng: 14.515, keywords: ['pogodno', 'pogodnie', 'mickiewicza', 'wernyhory', 'unruga', 'reymonta', 'żołnierska', 'traugutta', 'krasickiego'] },
  { id: 'gumience', name: 'Gumieńce', quarter: 'Zachód', lat: 53.409, lng: 14.502, keywords: ['gumieńce', 'gumience', 'ku słońcu', 'harnasiów', 'derdowskiego', 'lwowska', 'chobolańska', 'południowa', 'cukrowa'] },
  { id: 'krzekowo_bezrzecze', name: 'Krzekowo-Bezrzecze', quarter: 'Zachód', lat: 53.448, lng: 14.482, keywords: ['krzekowo', 'bezrzecze', 'modra', 'koralowa', 'szeroka', 'żołnierska'] },
  { id: 'swierczewo', name: 'Świerczewo', quarter: 'Zachód', lat: 53.421, lng: 14.512, keywords: ['świerczewo', 'swierczewo', 'santocka', 'witkiewicza', 'kaliny'] },
  { id: 'zawadzkiego', name: 'Zawadzkiego-Klonowica', quarter: 'Zachód', lat: 53.452, lng: 14.505, keywords: ['zawadzkiego', 'klonowica', 'szafera', 'marlicza', 'zawadzkiego-klonowica', 'netto arena'] },
  { id: 'glebokie_pilchowo', name: 'Głębokie-Pilchowo', quarter: 'Zachód', lat: 53.475, lng: 14.485, keywords: ['głębokie', 'glebokie', 'pilchowo', 'jezioro głębokie', 'jaworowa', 'kąpieliskowa'] },
  { id: 'arkonskie_niemierzyn', name: 'Arkońskie-Niemierzyn', quarter: 'Zachód', lat: 53.456, lng: 14.532, keywords: ['arkońskie', 'arkonskie', 'niemierzyn', 'arkońska', 'chopina', 'las arkoński', 'szpital arkońska'] },
  { id: 'pomorzany', name: 'Pomorzany', quarter: 'Zachód', lat: 53.402, lng: 14.532, keywords: ['pomorzany', 'pomorzanach', 'powstańców wielkopolskich', 'budziszyńska', 'starkiewicza', 'szpital pomorzany', 'włościańska', 'milczańska', 'ustowska'] },

  // Śródmieście
  { id: 'centrum', name: 'Centrum', quarter: 'Śródmieście', lat: 53.4285, lng: 14.5528, keywords: ['centrum', 'śródmieście', 'srodmiescie', 'brama portowa', 'plac grunwaldzki', 'plac rodła', 'krzywoustego', 'niepodległości', 'wojska polskiego', 'wyzwolenia'] },
  { id: 'stare_miasto', name: 'Stare Miasto', quarter: 'Śródmieście', lat: 53.425, lng: 14.562, keywords: ['stare miasto', 'starówka', 'panieńska', 'podzamcze', 'zamek książąt', 'katedra'] },
  { id: 'turzyn', name: 'Turzyn', quarter: 'Śródmieście', lat: 53.427, lng: 14.531, keywords: ['turzyn', 'turzynie', 'bohaterek warszawy', '26 kwietnia', 'turzyńska', 'plac kościuszki'] },
  { id: 'drzetowo_grabowo', name: 'Drzetowo-Grabowo', quarter: 'Śródmieście', lat: 53.449, lng: 14.572, keywords: ['drzetowo', 'grabowo', 'drzetowo-grabowo', 'dubois', 'hutnicza', 'stocznia', 'firlika'] },
  { id: 'lekno', name: 'Łękno', quarter: 'Śródmieście', lat: 53.443, lng: 14.536, keywords: ['łękno', 'lekno', 'jasne błonia', 'park kasprowicza', 'fałata', 'piotra skargi', 'solskiego'] },
  { id: 'niebuszewo_bolinko', name: 'Niebuszewo-Bolinko', quarter: 'Śródmieście', lat: 53.442, lng: 14.555, keywords: ['niebuszewo-bolinko', 'bolinko', 'staszica', 'orzeszkowej', 'kołłątaja', 'rondo giedroycia'] },
  { id: 'nowe_miasto', name: 'Nowe Miasto', quarter: 'Śródmieście', lat: 53.418, lng: 14.551, keywords: ['nowe miasto', 'narutowicza', 'piastów', 'potulicka', 'kolumba', 'dworzec główny'] },
  { id: 'srodmiescie_polnoc', name: 'Śródmieście-Północ', quarter: 'Śródmieście', lat: 53.438, lng: 14.556, keywords: ['śródmieście-północ', 'srodmiescie polnoc', 'felczaka', 'wąska', 'odzieżowa', 'unisławy'] },
  { id: 'srodmiescie_zachod', name: 'Śródmieście-Zachód', quarter: 'Śródmieście', lat: 53.429, lng: 14.542, keywords: ['śródmieście-zachód', 'srodmiescie zachod', 'jagiellońska', 'ściegiennego', 'bohaterów getta warszawskiego'] },
  { id: 'lasztownia_miedzyodrze', name: 'Międzyodrze-Wyspa Pucka (Łasztownia)', quarter: 'Śródmieście', lat: 53.4241, lng: 14.5612, keywords: ['łasztownia', 'lasztownia', 'międzyodrze', 'miedzyodrze', 'wyspa pucka', 'zbożowa', 'celna', 'wendy', 'stara rzeźnia', 'dźwigozaury'] },

  // Prawobrzeże
  { id: 'sloneczne', name: 'Słoneczne', quarter: 'Prawobrzeże', lat: 53.379, lng: 14.654, keywords: ['słoneczne', 'sloneczne', 'jasna', 'rydzla', 'łubinowa', 'heliosa'] },
  { id: 'majowe', name: 'Majowe', quarter: 'Prawobrzeże', lat: 53.382, lng: 14.671, keywords: ['majowe', 'majowym', 'botaniczna', 'zofii nałkowskiej', 'drogowców'] },
  { id: 'bukowe', name: 'Bukowe-Klęskowo', quarter: 'Prawobrzeże', lat: 53.368, lng: 14.662, keywords: ['bukowe', 'bukowym', 'klęskowo', 'kolorowych domów', 'chłopickiego'] },
  { id: 'dabie', name: 'Dąbie', quarter: 'Prawobrzeże', lat: 53.398, lng: 14.672, keywords: ['dąbie', 'dabie', 'goleniowska', 'gierczak', 'czarnogórska', 'jezioro dąbie'] },
  { id: 'zdroje', name: 'Zdroje', quarter: 'Prawobrzeże', lat: 53.377, lng: 14.628, keywords: ['zdroje', 'zdrojach', 'batalionów chłopskich', 'walecznych', 'szmaragdowa'] },
  { id: 'podjuchy', name: 'Podjuchy', quarter: 'Prawobrzeże', lat: 53.359, lng: 14.604, keywords: ['podjuchy', 'podjuchach', 'granitowa', 'metalowa', 'krzemienna'] },
  { id: 'kijewo', name: 'Kijewo', quarter: 'Prawobrzeże', lat: 53.388, lng: 14.672, keywords: ['kijewo', 'kijewie', 'niedźwiedzia', 'jeleniogórska', 'zwierzyniecka'] },
  { id: 'plonia_smierdnica_jezierzyce', name: 'Płonia-Śmierdnica-Jezierzyce', quarter: 'Prawobrzeże', lat: 53.342, lng: 14.685, keywords: ['płonia', 'plonia', 'śmierdnica', 'smierdnica', 'jezierzyce', 'pyrzycka', 'mostowa'] },
  { id: 'wielgowo_slawociesze_zdunowo', name: 'Wielgowo-Sławociesze-Zdunowo', quarter: 'Prawobrzeże', lat: 53.395, lng: 14.735, keywords: ['wielgowo', 'sławociesze', 'slawociesze', 'zdunowo', 'szpital zdunowo', 'bałtycka', 'wiślana'] },
  { id: 'zydowce_klucz', name: 'Żydowce-Klucz', quarter: 'Prawobrzeże', lat: 53.341, lng: 14.572, keywords: ['żydowce', 'zydowce', 'klucz', 'rymarska', 'bielańska', 'chmielna'] },
  { id: 'zalom_kasztanowe', name: 'Załom-Kasztanowe', quarter: 'Prawobrzeże', lat: 53.435, lng: 14.688, keywords: ['załom', 'zalom', 'osiedle kasztanowe', 'kasztanowa', 'pucka', 'cyprysowa'] },
];

/**
 * Resolves a raw location string to the most specific Szczecin micro-district.
 */
export function resolveSzczecinMicroDistrict(
  text: string | null | undefined
): SzczecinMicroDistrict | null {
  if (!text || typeof text !== 'string') return null;

  const lower = text.toLowerCase();

  // Try matching against all keywords
  for (const osiedle of SZCZECIN_OSIEDLA) {
    for (const kw of osiedle.keywords) {
      const rx = new RegExp(`\\b${kw}\\b`, 'i');
      if (rx.test(lower)) {
        return osiedle;
      }
    }
  }

  // Postal code resolution (70-xxx / 71-xxx)
  const postalMatch = lower.match(/\b(7[01]-\d{3})\b/);
  if (postalMatch) {
    const code = postalMatch[1];
    // 70-xxx -> Śródmieście / Prawobrzeże, 71-xxx -> Zachód / Północ
    if (code.startsWith('71-4') || code.startsWith('71-5')) {
      return SZCZECIN_OSIEDLA.find((o) => o.id === 'niebuszewo') || null;
    }
    if (code.startsWith('71-2') || code.startsWith('71-3')) {
      return SZCZECIN_OSIEDLA.find((o) => o.id === 'pogodno') || null;
    }
    if (code.startsWith('70-7') || code.startsWith('70-8')) {
      return SZCZECIN_OSIEDLA.find((o) => o.id === 'sloneczne') || null;
    }
    return SZCZECIN_OSIEDLA.find((o) => o.id === 'centrum') || null;
  }

  return null;
}
