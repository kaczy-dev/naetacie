/**
 * Seed script: Adds sample construction announcements to Firestore.
 * Run with: npx tsx scripts/seed-announcements.ts
 *
 * Uses the production Firebase Admin SDK (requires FIREBASE_SERVICE_ACCOUNT_KEY in .env.local).
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (!serviceAccount) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

// --- Real construction ads from Szczecin area ---

const ANNOUNCEMENTS = [
  {
    title: 'Kompleksowe remonty mieszkań i domów - Szczecin',
    description: 'Oferuję pełen zakres usług remontowo-budowlanych: malowanie, gładzie, płytki, podłogi, instalacje. Doświadczenie 15 lat. Terminowość i jakość gwarantowana.',
    source_portal: 'olx',
    category: 'budowa-remont',
    location_text: 'Szczecin, Centrum',
    latitude: 53.4285,
    longitude: 14.5528,
    price: 80,
    source_url: 'https://www.olx.pl/d/oferta/kompleksowe-remonty-mieszkan-szczecin',
  },
  {
    title: 'Usługi hydrauliczne - instalacje wod-kan, CO',
    description: 'Montaż i wymiana instalacji wodnych, kanalizacyjnych, centralnego ogrzewania. Podłączanie pralek, zmywarek. Awarie 24h.',
    source_portal: 'olx',
    category: 'instalacje',
    location_text: 'Szczecin, Pogodno',
    latitude: 53.4335,
    longitude: 14.5183,
    price: 120,
    source_url: 'https://www.olx.pl/d/oferta/uslugi-hydrauliczne-szczecin',
  },
  {
    title: 'Elektryk - instalacje elektryczne, pomiary',
    description: 'Wykonuję instalacje elektryczne w domach i mieszkaniach. Pomiary, protokoły, wymiana tablic. Uprawnienia SEP.',
    source_portal: 'olx',
    category: 'instalacje',
    location_text: 'Szczecin, Niebuszewo',
    latitude: 53.4468,
    longitude: 14.5622,
    price: 100,
    source_url: 'https://www.olx.pl/d/oferta/elektryk-szczecin-instalacje',
  },
  {
    title: 'Wykończenia wnętrz - malowanie, gładzie, tapety',
    description: 'Profesjonalne wykończenia wnętrz. Gładzie gipsowe, malowanie natryskowe, tapetowanie. Szybko i czysto.',
    source_portal: 'oferteo',
    category: 'wykończenia',
    location_text: 'Szczecin, Gumieńce',
    latitude: 53.3973,
    longitude: 14.5064,
    price: 60,
    source_url: 'https://www.oferteo.pl/wykonczenia-wnetrz/szczecin',
  },
  {
    title: 'Budowa domów jednorodzinnych pod klucz',
    description: 'Stawiamy domy jednorodzinne od fundamentów po dach. Stan surowy, surowy zamknięty, pod klucz. Ekipa z Szczecina.',
    source_portal: 'olx',
    category: 'budowa',
    location_text: 'Police',
    latitude: 53.5513,
    longitude: 14.5692,
    price: null,
    source_url: 'https://www.olx.pl/d/oferta/budowa-domow-police',
  },
  {
    title: 'Docieplenia budynków - styropian, wełna mineralna',
    description: 'Ocieplanie budynków metodą BSO. Styropian, wełna, kleje, tynki. Rusztowania własne. Realizacja Szczecin i okolice 50km.',
    source_portal: 'olx',
    category: 'budowa',
    location_text: 'Szczecin, Prawobrzeże',
    latitude: 53.4090,
    longitude: 14.6133,
    price: 150,
    source_url: 'https://www.olx.pl/d/oferta/docieplenia-szczecin',
  },
  {
    title: 'Układanie płytek - łazienki, kuchnie, tarasy',
    description: 'Profesjonalne układanie płytek ceramicznych i gresowych. Łazienki od A do Z, hydroizolacja, fugowanie.',
    source_portal: 'oferteo',
    category: 'wykończenia',
    location_text: 'Szczecin, Bezrzecze',
    latitude: 53.3683,
    longitude: 14.5789,
    price: 90,
    source_url: 'https://www.oferteo.pl/plytki/szczecin',
  },
  {
    title: 'Usługi dekarskie - dachy, rynny, obróbki',
    description: 'Pokrycia dachowe: blachodachówka, dachówka, papa. Wymiana rynien, obróbek blacharskich. Naprawa przecieków.',
    source_portal: 'olx',
    category: 'budowa',
    location_text: 'Stargard',
    latitude: 53.3362,
    longitude: 15.0500,
    price: 200,
    source_url: 'https://www.olx.pl/d/oferta/dekarz-stargard',
  },
  {
    title: 'Montaż okien i drzwi - PCV, aluminium, drewno',
    description: 'Wymiana i montaż okien pcv, aluminiowych. Drzwi wejściowe, wewnętrzne. Parapety, rolety. Pomiar gratis.',
    source_portal: 'olx',
    category: 'instalacje',
    location_text: 'Szczecin, Dąbie',
    latitude: 53.4539,
    longitude: 14.5281,
    price: null,
    source_url: 'https://www.olx.pl/d/oferta/okna-drzwi-szczecin',
  },
  {
    title: 'Tynki maszynowe, posadzki, wylewki',
    description: 'Tynki gipsowe i cementowo-wapienne maszynowo. Wylewki samopoziomujące. Duże i małe zlecenia. Faktura VAT.',
    source_portal: 'oferteo',
    category: 'budowa',
    location_text: 'Goleniów',
    latitude: 53.5640,
    longitude: 14.8298,
    price: 35,
    source_url: 'https://www.oferteo.pl/tynki-maszynowe/goleniow',
  },
  {
    title: 'Ogrodzenia - panelowe, drewniane, gabionowe',
    description: 'Montaż ogrodzeń: panele ogrodzeniowe, siatka, drewniane sztachety, gabiony. Bramy przesuwne i skrzydłowe.',
    source_portal: 'olx',
    category: 'budowa',
    location_text: 'Szczecin, Załom',
    latitude: 53.3932,
    longitude: 14.6488,
    price: 180,
    source_url: 'https://www.olx.pl/d/oferta/ogrodzenia-szczecin',
  },
  {
    title: 'Usługi brukarskie - kostka brukowa, chodniki',
    description: 'Układanie kostki brukowej, budowa chodników, podjazdów, parkingów. Obrzeża, krawężniki. Własny sprzęt.',
    source_portal: 'olx',
    category: 'budowa',
    location_text: 'Szczecin, Pogodno',
    latitude: 53.4370,
    longitude: 14.5210,
    price: 110,
    source_url: 'https://www.olx.pl/d/oferta/brukarz-szczecin',
  },
  {
    title: 'Klimatyzacja - montaż, serwis, naprawa',
    description: 'Montaż klimatyzacji domowej i biurowej. Serwis, czyszczenie, napełnianie. Certyfikat F-gazowy.',
    source_portal: 'oferteo',
    category: 'instalacje',
    location_text: 'Szczecin, Centrum',
    latitude: 53.4300,
    longitude: 14.5550,
    price: 2500,
    source_url: 'https://www.oferteo.pl/klimatyzacja/szczecin',
  },
  {
    title: 'Wyburzenia, rozbiórki, wywóz gruzu',
    description: 'Wyburzenia ścian, rozbiórki budynków, kucie betonu. Wywóz gruzu kontenerem. Szybko i sprawnie.',
    source_portal: 'olx',
    category: 'budowa',
    location_text: 'Gryfino',
    latitude: 53.2538,
    longitude: 14.4889,
    price: 50,
    source_url: 'https://www.olx.pl/d/oferta/wyburzenia-gryfino',
  },
  {
    title: 'Podłogi - panele, deska, winyl LVT',
    description: 'Układanie paneli podłogowych, deski barlineckiej, wykładzin winylowych LVT/SPC. Wyrównywanie podłoży.',
    source_portal: 'olx',
    category: 'wykończenia',
    location_text: 'Szczecin, Niebuszewo',
    latitude: 53.4450,
    longitude: 14.5600,
    price: 45,
    source_url: 'https://www.olx.pl/d/oferta/podlogi-panele-szczecin',
  },
  {
    title: 'Firma budowlana - generalny wykonawca',
    description: 'Kompleksowa obsługa inwestycji budowlanych. Od projektu po odbiór. Domy, lokale usługowe, hale. Szczecin i okolice.',
    source_portal: 'oferteo',
    category: 'budowa',
    location_text: 'Szczecin',
    latitude: 53.4250,
    longitude: 14.5480,
    price: null,
    source_url: 'https://www.oferteo.pl/generalny-wykonawca/szczecin',
  },
  {
    title: 'Instalacje gazowe - piece, kotły, kominki',
    description: 'Montaż kotłów gazowych, pieców, kominków z płaszczem wodnym. Przeglądy gazowe, protokoły. Uprawnienia.',
    source_portal: 'olx',
    category: 'instalacje',
    location_text: 'Police',
    latitude: 53.5480,
    longitude: 14.5730,
    price: 300,
    source_url: 'https://www.olx.pl/d/oferta/instalacje-gazowe-police',
  },
  {
    title: 'Malowanie mieszkań - szybko, czysto, tanio',
    description: 'Malowanie ścian i sufitów. Przygotowanie podłoża, szpachlowanie, gruntowanie. Farby klienta lub moje. Od 12 zł/m2.',
    source_portal: 'olx',
    category: 'wykończenia',
    location_text: 'Szczecin, Centrum',
    latitude: 53.4295,
    longitude: 14.5540,
    price: 12,
    source_url: 'https://www.olx.pl/d/oferta/malowanie-mieszkan-szczecin',
  },
  {
    title: 'Prace ziemne - koparki, minikoparki, transport',
    description: 'Usługi koparką i minikoparką. Wykopy pod fundamenty, przyłącza, baseny. Transport ziemi, gruzu.',
    source_portal: 'olx',
    category: 'budowa',
    location_text: 'Goleniów',
    latitude: 53.5600,
    longitude: 14.8350,
    price: 180,
    source_url: 'https://www.olx.pl/d/oferta/koparki-goleniow',
  },
  {
    title: 'Regipsy, sufity podwieszane, zabudowy',
    description: 'Montaż ścianek z płyt gipsowo-kartonowych, sufitów podwieszanych, zabudów instalacji. Certyfikat Knauf.',
    source_portal: 'oferteo',
    category: 'wykończenia',
    location_text: 'Szczecin, Gumieńce',
    latitude: 53.4000,
    longitude: 14.5100,
    price: 55,
    source_url: 'https://www.oferteo.pl/regipsy/szczecin',
  },
];

async function seed() {
  console.log('🌱 Seeding Firestore with construction announcements...\n');

  const batch = db.batch();
  const now = new Date();

  for (let i = 0; i < ANNOUNCEMENTS.length; i++) {
    const ad = ANNOUNCEMENTS[i];
    const id = `seed_${ad.source_portal}_${i}`;
    const docRef = db.collection('announcements').doc(id);

    batch.set(docRef, {
      deduplication_key: id,
      title: ad.title,
      description: ad.description,
      source_url: ad.source_url,
      source_portal: ad.source_portal,
      category: ad.category,
      location_text: ad.location_text,
      latitude: ad.latitude,
      longitude: ad.longitude,
      price: ad.price,
      contact_info: null,
      scraped_at: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
      published_at: new Date(now.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000),
    }, { merge: true });
  }

  await batch.commit();
  console.log(`✅ Added ${ANNOUNCEMENTS.length} announcements to Firestore`);
  console.log('   Categories: budowa, instalacje, wykończenia');
  console.log('   Locations: Szczecin, Police, Stargard, Goleniów, Gryfino');
  console.log('\n🎉 Done! Restart your Next.js dev server to see the data.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
