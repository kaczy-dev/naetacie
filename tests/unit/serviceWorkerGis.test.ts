import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Service Worker 2.0 GIS Offline Tile Caching', () => {
  it('contains tile cache storage and GIS tile host rules in sw.js', () => {
    const swPath = path.resolve(process.cwd(), 'public/sw.js');
    const content = fs.readFileSync(swPath, 'utf8');

    expect(content).toContain('TILE_CACHE_NAME');
    expect(content).toContain('basemaps.cartocdn.com');
    expect(content).toContain('server.arcgisonline.com');
    expect(content).toContain('tileCache.put');
  });
});
