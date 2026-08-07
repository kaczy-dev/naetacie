import { describe, it, expect } from 'vitest';
import { healAnnouncementLink } from '@/lib/verification/linkHealer';

describe('Smart Link Healer Engine', () => {
  it('preserves valid direct live offer links', async () => {
    const res = await healAnnouncementLink({
      source_portal: 'olx',
      source_url: 'https://www.olx.pl/d/oferta/murarz-tynkarz-ID12345.html',
      title: 'Murarz Tynkarz',
    });

    expect(res.url).toBe('https://www.olx.pl/d/oferta/murarz-tynkarz-ID12345.html');
    expect(res.isDirectOffer).toBe(true);
  });

  it('heals missing or dead offer links into active targeted portal search queries', async () => {
    const res = await healAnnouncementLink({
      source_portal: 'pracuj',
      source_url: '',
      title: 'Firma Onesto zatrudni dekarza z doświadczeniem',
    });

    expect(res.url).toBe('https://www.pracuj.pl/praca/dekarz;kw/szczecin;wp');
    expect(res.isDirectOffer).toBe(false);
    expect(res.status).toBe('healed_search');
  });
});
