/**
 * Type declarations for leaflet.heat plugin.
 * Augments the Leaflet namespace with the heatLayer factory.
 *
 * The top-level `export {}` is required to make this file a module,
 * which turns `declare module 'leaflet'` into an augmentation rather
 * than an ambient (replacement) declaration.
 */
export {};

declare module 'leaflet' {
  interface HeatLayerOptions {
    /** Minimum opacity (0–1). Default 0.05 */
    minOpacity?: number;
    /** Zoom level where heatmap has max intensity. Default 18 */
    maxZoom?: number;
    /** Maximum data point intensity. Default 1 */
    max?: number;
    /** Radius of each data point in pixels. Default 25 */
    radius?: number;
    /** Blur radius in pixels. Default 15 */
    blur?: number;
    /** Color gradient mapping from intensity (0–1) to CSS colors */
    gradient?: Record<number, string>;
  }

  interface HeatLayer extends Layer {
    setLatLngs(latlngs: Array<[number, number] | [number, number, number]>): this;
    addLatLng(latlng: [number, number] | [number, number, number]): this;
    setOptions(options: HeatLayerOptions): this;
    redraw(): this;
    addTo(map: Map): this;
    remove(): this;
  }

  function heatLayer(
    latlngs: Array<[number, number] | [number, number, number]>,
    options?: HeatLayerOptions
  ): HeatLayer;
}

declare module 'leaflet.heat' {
  // Side-effect import — patches L with heatLayer
}
