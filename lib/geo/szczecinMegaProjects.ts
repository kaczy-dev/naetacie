/**
 * Major Construction Projects & Tower Cranes in Szczecin (2026).
 * 
 * Provides real-world geospatial data of major commercial, industrial,
 * residential, and infrastructure investments across Szczecin.
 */

export interface MegaConstructionProject {
  id: string;
  name: string;
  developer: string;
  district: string;
  coordinates: [number, number]; // [lng, lat]
  towerCranesCount: number;
  status: 'active_structural' | 'finishing_works' | 'earthworks' | 'infrastructure';
  estimatedValuePLN: string;
  demandedTrades: string[];
  description: string;
}

export const SZCZECIN_MEGA_PROJECTS: MegaConstructionProject[] = [
  {
    id: 'proj_lasztownia',
    name: 'Wielofunkcyjna Dzielnica Łasztownia & Bulwary',
    developer: 'Inwestycje Miejskie / Deweloperzy',
    district: 'Łasztownia / Międzyodrze',
    coordinates: [14.5612, 53.4241],
    towerCranesCount: 6,
    status: 'active_structural',
    estimatedValuePLN: '450 mln zł',
    demandedTrades: ['Zbrojarz', 'Cieśla szalunkowy', 'Elektryk', 'Murarz', 'Hydraulik'],
    description: 'Budowa nowoczesnych apartamentowców, biur i przestrzeni rekreacyjnej nad Odrą.',
  },
  {
    id: 'proj_nowa_cukrownia',
    name: 'Osiedle Nowa Cukrownia & Południowa Park',
    developer: 'Alsecco / Siemens Partner',
    district: 'Gumieńce',
    coordinates: [14.4985, 53.3942],
    towerCranesCount: 4,
    status: 'finishing_works',
    estimatedValuePLN: '180 mln zł',
    demandedTrades: ['Glazurnik', 'Gładzie / Malarz', 'Monter instalacji', 'Parkieciarz'],
    description: 'Nowy etap wieloetapowego osiedla mieszkaniowego z lokalami usługowymi.',
  },
  {
    id: 'proj_port_hryniewieckiego',
    name: 'Modernizacja Nabrzeży i Magazynów Portu Szczecin',
    developer: 'Zarząd Morskich Portów Szczecin i Świnoujście',
    district: 'Port Szczecin',
    coordinates: [14.5823, 53.4328],
    towerCranesCount: 5,
    status: 'infrastructure',
    estimatedValuePLN: '620 mln zł',
    demandedTrades: ['Spawacz', 'Operator dźwigu', 'Betoniarz', 'Elektryk przemysłowy'],
    description: 'Pogłębianie toru wodnego i rozbudowa terminali logistycznych.',
  },
  {
    id: 'proj_warszewo_panoramika',
    name: 'Kompleks Apartamentów Panorama Warszewo',
    developer: 'SGI Deweloper',
    district: 'Warszewo',
    coordinates: [14.5385, 14.5385 > 50 ? 53.4712 : 53.4712],
    towerCranesCount: 3,
    status: 'active_structural',
    estimatedValuePLN: '120 mln zł',
    demandedTrades: ['Murarz', 'Dekarz', 'Dociepleniowiec', 'Monter okien'],
    description: 'Ekskluzywne osiedle willowe i apartamentowe z widokiem na Szczecin.',
  },
  {
    id: 'proj_doki_stocznia',
    name: 'Szczeciński Park Przemysłowy & Tereny Stoczniowe',
    developer: 'Polskie Doki / Konsorcjum',
    district: 'Drzetowo-Grabowo',
    coordinates: [14.5752, 53.4485],
    towerCranesCount: 8,
    status: 'active_structural',
    estimatedValuePLN: '310 mln zł',
    demandedTrades: ['Spawacz TIG/MAG', 'Monter rurociągów', 'Ślusarz', 'Elektromonter'],
    description: 'Rozbudowa hal prefabrykacji konstrukcji stalowych i morskich farm wiatrowych.',
  },
  {
    id: 'proj_dworzec_turzyn',
    name: 'Węzeł Przesiadkowy i Centrum Usługowe Turzyn',
    developer: 'PKP / Miasto Szczecin',
    district: 'Turzyn',
    coordinates: [14.5298, 53.4245],
    towerCranesCount: 2,
    status: 'active_structural',
    estimatedValuePLN: '95 mln zł',
    demandedTrades: ['Brukarz', 'Zbrojarz', 'Monter torowy', 'Elektryk'],
    description: 'Integracja Szczecińskiej Kolei Metropolitalnej z komunikacją miejską.',
  },
  {
    id: 'proj_szpital_pomorzany',
    name: 'Rozbudowa Uniwersyteckiego Centrum Klinicznego PUM Pomorzany',
    developer: 'PUM Szczecin / Skanska',
    district: 'Pomorzany',
    coordinates: [14.5305, 53.4015],
    towerCranesCount: 4,
    status: 'active_structural',
    estimatedValuePLN: '850 mln zł',
    demandedTrades: ['Zbrojarz', 'Elektromonter', 'Monter HVAC', 'Glazurnik', 'Instalator gazów medycznych'],
    description: 'Budowa nowoczesnego szpitalnego kompleksu klinicznego i centrum zabiegowego.',
  },
  {
    id: 'proj_podborzanska_polnoc',
    name: 'Kompleks Mieszkaniowy Warszewo-Północ & Podbórzańska',
    developer: 'Calbud / Siemaszko',
    district: 'Warszewo',
    coordinates: [14.5392, 53.4795],
    towerCranesCount: 3,
    status: 'active_structural',
    estimatedValuePLN: '160 mln zł',
    demandedTrades: ['Murarz', 'Cieśla', 'Dekarz', 'Tynkarz', 'Monter stolarki'],
    description: 'Nowy korytarz mieszkaniowy z pełną infrastrukturą drogową i usługową.',
  },
];
