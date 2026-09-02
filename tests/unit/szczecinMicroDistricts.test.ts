import { describe, it, expect } from 'vitest';
import {
  resolveSzczecinMicroDistrict,
  SZCZECIN_OSIEDLA,
} from '@/lib/geo/szczecinMicroDistricts';

describe('Szczecin Micro-Districts & Postal Code Resolution', () => {
  it('contains at least 24 municipal Szczecin osiedla', () => {
    expect(SZCZECIN_OSIEDLA.length).toBeGreaterThanOrEqual(24);
  });

  it('resolves direct osiedle names accurately', () => {
    const warszewo = resolveSzczecinMicroDistrict('Zlecenie malowania domu na Warszewie');
    expect(warszewo?.id).toBe('warszewo');
    expect(warszewo?.quarter).toBe('Północ');

    const pogodno = resolveSzczecinMicroDistrict('Szczecin, Pogodno, ul. Reymonta');
    expect(pogodno?.id).toBe('pogodno');
    expect(pogodno?.quarter).toBe('Zachód');

    const sloneczne = resolveSzczecinMicroDistrict('Remont mieszkania os. Słoneczne');
    expect(sloneczne?.id).toBe('sloneczne');
    expect(sloneczne?.quarter).toBe('Prawobrzeże');
  });

  it('resolves landmark streets and locations to osiedla', () => {
    const santocka = resolveSzczecinMicroDistrict('Budowa przy ul. Santocka');
    expect(santocka?.id).toBe('swierczewo');

    const jasneBlonia = resolveSzczecinMicroDistrict('Prace wykończeniowe blisko Jasne Błonia');
    expect(jasneBlonia?.id).toBe('lekno');

    const bramaPortowa = resolveSzczecinMicroDistrict('Lokal usługowy Brama Portowa');
    expect(bramaPortowa?.id).toBe('centrum');
  });

  it('resolves Szczecin postal codes correctly', () => {
    const niebuszewo = resolveSzczecinMicroDistrict('Adres: 71-450 Szczecin');
    expect(niebuszewo?.id).toBe('niebuszewo');

    const pogodno = resolveSzczecinMicroDistrict('Kod: 71-210');
    expect(pogodno?.id).toBe('pogodno');
  });

  it('returns null for generic or out-of-city locations', () => {
    expect(resolveSzczecinMicroDistrict(null)).toBeNull();
    expect(resolveSzczecinMicroDistrict('Warszawa')).toBeNull();
  });
});
