/**
 * Scraped Ads CSV & JSON Exporter Utility.
 * Formats job postings for spreadsheet download or offline analysis.
 */

import { ScrapedAd } from '@/lib/scraper/types';

export function exportAdsToCSV(ads: ScrapedAd[]): string {
  const headers = [
    'ID',
    'Tytuł',
    'Kategoria',
    'Portal',
    'Lokalizacja',
    'Cena / Wynagrodzenie',
    'Zarobki Min (PLN)',
    'Zarobki Max (PLN)',
    'Typ Stawki',
    'Telefon',
    'Firma',
    'Typ Umowy',
    'Grafik',
    'Doświadczenie',
    'URL',
    'Data Pobrania',
  ];

  const escapeCsv = (str: string | null | undefined): string => {
    if (!str) return '""';
    const cleaned = String(str).replace(/"/g, '""').replace(/\n/g, ' ');
    return `"${cleaned}"`;
  };

  const rows = ads.map((ad) => [
    escapeCsv(ad.id),
    escapeCsv(ad.title),
    escapeCsv(ad.category),
    escapeCsv(ad.source_portal),
    escapeCsv(ad.location_text),
    escapeCsv(ad.price || ad.salary_range?.raw || ''),
    ad.salary_range?.min ?? '',
    ad.salary_range?.max ?? '',
    escapeCsv(ad.salary_range?.type || ''),
    escapeCsv(ad.phone || ''),
    escapeCsv(ad.company || ''),
    escapeCsv(ad.contract_type || ad.employment_type || ''),
    escapeCsv(ad.work_schedule || ''),
    escapeCsv(ad.experience_level || ''),
    escapeCsv(ad.source_url),
    escapeCsv(ad.scraped_at),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
