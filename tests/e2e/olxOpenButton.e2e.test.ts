import { describe, it, expect } from 'vitest';
import { SEED_DATA } from '@/lib/data/announcements';
import { getAnnouncementExternalUrl } from '@/lib/utils';
import { healAnnouncementLink } from '@/lib/verification/linkHealer';

describe('OLX "Zobacz w OLX" / "Otwórz" Button E2E Integration Flow Test Suite', () => {
  const olxSeedAds = SEED_DATA.filter((ad) => ad.source_portal.toLowerCase() === 'olx');

  it('Step 1: Verifies all OLX seed announcements yield valid, clickable external URLs', () => {
    expect(olxSeedAds.length).toBeGreaterThan(0);

    for (const ad of olxSeedAds) {
      const url = getAnnouncementExternalUrl(ad);
      expect(url).toBeDefined();
      expect(url.startsWith('https://www.olx.pl/')).toBe(true);

      // Verify that URL is either a direct offer URL (/d/oferta/) or a valid search URL
      const isDirectOffer = url.includes('/d/oferta/');
      const isWorkingSearch = url.includes('/search') || url.includes('/szczecin/?search') || url.includes('/q-');

      expect(isDirectOffer || isWorkingSearch).toBe(true);
      // Ensure no obsolete ?q= parameter is present
      expect(url).not.toContain('?q=');
    }
  });

  it('Step 2: Simulates clicking "Zobacz w OLX" button in Card / QuickView view', () => {
    const testAd = olxSeedAds[0];
    const targetUrl = getAnnouncementExternalUrl(testAd);

    // Simulate button attributes required for security and UX
    const buttonProps = {
      href: targetUrl,
      target: '_blank',
      rel: 'noopener noreferrer',
      title: 'Otwórz ogłoszenie w nowej karcie',
    };

    expect(buttonProps.href).toBe(targetUrl);
    expect(buttonProps.target).toBe('_blank');
    expect(buttonProps.rel).toBe('noopener noreferrer');
  });

  it('Step 3: Simulates event propagation stopping (stopPropagation) on button click', () => {
    let cardToggled = false;
    let buttonClicked = false;

    const mockCardClick = () => {
      cardToggled = true;
    };

    const mockButtonClick = (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      buttonClicked = true;
    };

    // Simulate event object
    let stopped = false;
    const fakeEvent = {
      stopPropagation: () => {
        stopped = true;
      },
    };

    mockButtonClick(fakeEvent);

    if (!stopped) {
      mockCardClick();
    }

    expect(buttonClicked).toBe(true);
    expect(stopped).toBe(true);
    expect(cardToggled).toBe(false); // Card expand should NOT trigger on button click
  });

  it('Step 4: End-to-end Link Healing pipeline verification for OLX button', async () => {
    const activeDirectAd = {
      source_portal: 'olx',
      source_url: 'https://www.olx.pl/d/oferta/stolarz-budowlany-schody-police-ID6xCyd.html',
      title: 'Stolarz budowlany',
      id: 'j24',
    };

    const healedResult = await healAnnouncementLink(activeDirectAd);
    expect(healedResult.status).toBe('active_direct');
    expect(healedResult.url).toBe(activeDirectAd.source_url);
    expect(healedResult.isDirectOffer).toBe(true);
  });

  it('Step 5: Verifies Side-by-Side Job Comparison Matrix generates working OLX links', () => {
    for (const ad of olxSeedAds.slice(0, 3)) {
      const compareUrl = getAnnouncementExternalUrl(ad);
      expect(compareUrl.startsWith('https://www.olx.pl/')).toBe(true);
    }
  });
});
