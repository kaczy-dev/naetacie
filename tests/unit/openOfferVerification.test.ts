import { describe, it, expect } from 'vitest';
import { getAnnouncementExternalUrl, ensureAbsoluteUrl } from '@/lib/utils';
import { GET as redirectHandler } from '@/app/api/announcements/redirect/route';

describe('Verification of "OTWÓRZ" Action & Live Offer Links', () => {
  it('resolves direct live OLX offer link to canonical https://www.olx.pl/d/oferta/...html', () => {
    const ad = {
      source_portal: 'olx',
      source_url: 'https://www.olx.pl/d/oferta/murarz-tynkarz-ID123456.html',
      title: 'Murarz-Tynkarz',
      id: 'olx_123456',
    };

    const url = getAnnouncementExternalUrl(ad);
    expect(url).toBe('https://www.olx.pl/d/oferta/murarz-tynkarz-ID123456.html');
  });

  it('resolves direct live Pracuj.pl offer link to canonical https://www.pracuj.pl/praca/...', () => {
    const ad = {
      source_portal: 'pracuj',
      source_url: '/praca/elektryk-szczecin,oferta,10034212',
      title: 'Elektryk Budowlany',
      id: 'pracuj_10034212',
    };

    const url = getAnnouncementExternalUrl(ad);
    expect(url).toBe('https://www.pracuj.pl/praca/elektryk-szczecin,oferta,10034212');
  });

  it('resolves direct live Indeed offer link to canonical https://pl.indeed.com/viewjob?jk=...', () => {
    const ad = {
      source_portal: 'indeed',
      source_url: 'https://pl.indeed.com/viewjob?jk=abc123456789',
      title: 'Dekarz',
      id: 'indeed_abc123',
    };

    const url = getAnnouncementExternalUrl(ad);
    expect(url).toBe('https://pl.indeed.com/viewjob?jk=abc123456789');
  });

  it('builds real-time targeted search link on portal if offer URL is missing', () => {
    const adPracuj = {
      source_portal: 'pracuj',
      title: 'Hydraulik Szczecin',
      source_url: '',
    };
    expect(getAnnouncementExternalUrl(adPracuj)).toBe(
      'https://www.pracuj.pl/praca/Hydraulik;kw/szczecin;wp'
    );

    const adIndeed = {
      source_portal: 'indeed',
      title: 'Monter klimatyzacji Szczecin',
      source_url: '',
    };
    expect(getAnnouncementExternalUrl(adIndeed)).toBe(
      'https://pl.indeed.com/jobs?q=Monter%20klimatyzacji&l=Szczecin'
    );
  });

  it('/api/announcements/redirect performs 307 redirect to target live offer URL', async () => {
    const req = new Request(
      'http://localhost:3000/api/announcements/redirect?portal=pracuj&url=https%3A%2F%2Fwww.pracuj.pl%2Fpraca%2Felektryk%2Coferta%2C999&title=Elektryk'
    );
    const res = await redirectHandler(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://www.pracuj.pl/praca/elektryk,oferta,999');
  });
});
