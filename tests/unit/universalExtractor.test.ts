import { describe, it, expect } from 'vitest';
import {
  extractJsonLdJobs,
  extractOpenGraphMetadata,
  extractNextDataState,
  parseStructuredSalary,
} from '@/lib/scraper/universalExtractor';

describe('Universal Semantic HTML & Structured Metadata Extractor', () => {
  describe('extractJsonLdJobs', () => {
    it('extracts complete JobPosting schema with salary, hiringOrganization, and location', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": "Kierownik Budowy / Inżynier Budowy",
            "description": "<p>Poszukujemy kierownika budowy z uprawnieniami.</p>",
            "datePosted": "2026-08-01T10:00:00Z",
            "employmentType": "FULL_TIME",
            "hiringOrganization": {
              "@type": "Organization",
              "name": "Eiffage Polska Budownictwo"
            },
            "jobLocation": {
              "@type": "Place",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Szczecin",
                "addressRegion": "Zachodniopomorskie"
              }
            },
            "baseSalary": {
              "@type": "MonetaryAmount",
              "currency": "PLN",
              "value": {
                "@type": "QuantitativeValue",
                "minValue": 12000,
                "maxValue": 16000,
                "unitText": "MONTH"
              }
            }
          }
          </script>
        </head>
        <body></body>
        </html>
      `;

      const jobs = extractJsonLdJobs(html);
      expect(jobs.length).toBe(1);
      expect(jobs[0].title).toBe('Kierownik Budowy / Inżynier Budowy');
      expect(jobs[0].company).toBe('Eiffage Polska Budownictwo');
      expect(jobs[0].location).toBe('Szczecin');
      expect(jobs[0].price).toBe('12000–16000 zł/mies.');
      expect(jobs[0].salaryRange).toEqual({
        min: 12000,
        max: 16000,
        currency: 'PLN',
        type: 'monthly',
        isGross: true,
        raw: '12000–16000 zł/mies.',
      });
      expect(jobs[0].employmentType).toBe('FULL_TIME');
    });

    it('extracts nested @graph arrays with multiple Offer and JobPosting objects', () => {
      const html = `
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "JobPosting",
              "title": "Cieśla szalunkowy",
              "description": "Praca przy szalunkach Doka",
              "baseSalary": {
                "@type": "MonetaryAmount",
                "currency": "PLN",
                "value": {
                  "value": 45,
                  "unitText": "HOUR"
                }
              }
            },
            {
              "@type": "JobPosting",
              "title": "Zbrojarz",
              "description": "Wiązanie zbrojenia"
            }
          ]
        }
        </script>
      `;

      const jobs = extractJsonLdJobs(html);
      expect(jobs.length).toBe(2);
      expect(jobs[0].title).toBe('Cieśla szalunkowy');
      expect(jobs[0].price).toBe('45 zł/h');
      expect(jobs[0].salaryRange?.type).toBe('hourly');
      expect(jobs[1].title).toBe('Zbrojarz');
    });

    it('decodes HTML entities in titles and descriptions', () => {
      const html = `
        <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Glazurnik &amp; P&#x142;ytkarz &ndash; Szczecin",
          "description": "Uk&#x142;adanie p&#x142;ytek &plusmn; 2mm &oacute;wcze&#x15b;nie"
        }
        </script>
      `;

      const jobs = extractJsonLdJobs(html);
      expect(jobs[0].title).toBe('Glazurnik & Płytkarz – Szczecin');
      expect(jobs[0].description).toContain('Układanie płytek ± 2mm ówcześnie');
    });
  });

  describe('extractOpenGraphMetadata', () => {
    it('extracts OpenGraph title, description, and site_name', () => {
      const html = `
        <meta property="og:title" content="Praca: Elektryk Budowlany (Szczecin)" />
        <meta property="og:description" content="Atrakcyjna stawka, dojazd busem, umowa o pracę." />
        <meta property="og:site_name" content="Pracuj.pl" />
      `;

      const og = extractOpenGraphMetadata(html);
      expect(og.title).toBe('Praca: Elektryk Budowlany (Szczecin)');
      expect(og.description).toContain('Atrakcyjna stawka, dojazd busem');
      expect(og.company).toBe('Pracuj.pl');
    });
  });

  describe('extractNextDataState', () => {
    it('parses embedded __NEXT_DATA__ script tag into JSON object', () => {
      const html = `
        <script id="__NEXT_DATA__" type="application/json">
        {"props":{"pageProps":{"jobs":[{"id":123,"title":"Dekarz"}]}}}
        </script>
      `;

      const state = extractNextDataState(html);
      expect(state).toBeDefined();
      expect((state as any)?.props?.pageProps?.jobs[0]?.title).toBe('Dekarz');
    });
  });

  describe('parseStructuredSalary', () => {
    it('handles numeric single value and hourly unitCode', () => {
      const res = parseStructuredSalary({
        price: 50,
        currency: 'PLN',
        unitText: 'HOUR',
      });

      expect(res.priceText).toBe('50 zł/h');
      expect(res.salaryRange).toEqual({
        min: 50,
        max: 50,
        currency: 'PLN',
        type: 'hourly',
        isGross: true,
        raw: '50 zł/h',
      });
    });

    it('handles Euro currency properly', () => {
      const res = parseStructuredSalary({
        minValue: 3000,
        maxValue: 4500,
        currency: 'EUR',
        unitText: 'MONTH',
      });

      expect(res.priceText).toBe('3000–4500 €/mies.');
      expect(res.salaryRange?.currency).toBe('EUR');
    });
  });
});
