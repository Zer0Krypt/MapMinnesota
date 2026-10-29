import type { Map as MLMap, StyleSpecification } from 'maplibre-gl';
import { LAKE_SUPERIOR, MN_OUTLINE, outsideMask } from '../data/geo';

export type BasemapId = 'midnight' | 'daylight' | 'satellite' | 'northwoods';

export interface Basemap {
  id: BasemapId;
  name: string;
  blurb: string;
  theme: 'dark' | 'light';
  background: string;
  land: string;
  water: string;
  /** Remote raster layer to show (null = fully self-hosted style). */
  raster: string | null;
  maskColor: string;
  maskOpacity: number;
  border: string;
  swatch: string; // CSS background for the switcher thumbnail
}

export const BASEMAPS: Record<BasemapId, Basemap> = {
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    blurb: 'Dark, dramatic, data-forward',
    theme: 'dark',
    background: '#060b15',
    land: '#0d1829',
    water: '#0f2b4a',
    raster: 'bm-dark',
    maskColor: '#02050b',
    maskOpacity: 0.5,
    border: '#5eead4',
    swatch: 'radial-gradient(circle at 30% 30%, #1b2b47 0%, #0b1424 55%, #050a13 100%)',
  },
  daylight: {
    id: 'daylight',
    name: 'Daylight',
    blurb: 'Clean and light',
    theme: 'light',
    background: '#dfe5ec',
    land: '#f6f7f9',
    water: '#c9dcec',
    raster: 'bm-light',
    maskColor: '#9aa7b8',
    maskOpacity: 0.35,
    border: '#0f766e',
    swatch: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #eef1f5 55%, #c9dcec 100%)',
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    blurb: 'Aerial imagery',
    theme: 'dark',
    background: '#0b0f0c',
    land: '#1d2a1f',
    water: '#0d2233',
    raster: 'bm-imagery',
    maskColor: '#000000',
    maskOpacity: 0.5,
    border: '#fde68a',
    swatch: 'radial-gradient(circle at 35% 35%, #5d7b4a 0%, #2f4a2c 45%, #13263a 100%)',
  },
  northwoods: {
    id: 'northwoods',
    name: 'North Woods',
    blurb: 'Custom Minnesota style — water & forest',
    theme: 'dark',
    background: '#07141a',
    land: '#132b22',
    water: '#103a52',
    raster: null,
    maskColor: '#030b0d',
    maskOpacity: 0.55,
    border: '#a7f3d0',
    swatch: 'radial-gradient(circle at 30% 30%, #2f6b4f 0%, #163a2c 50%, #0b2a3a 100%)',
  },
};

const RASTER_LAYERS = ['bm-dark', 'bm-light', 'bm-imagery'];

const glyphs = () =>
  new URL(`${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`, window.location.href).href.replace(
    /%7B(\w+)%7D/g,
    '{$1}',
  );

const carto = (style: string) =>
  ['a', 'b', 'c', 'd'].map((s) => `https://${s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}@2x.png`);

/** The base style: basemap rasters + self-hosted Minnesota land/water + mask & border. */
export function baseStyle(id: BasemapId): StyleSpecification {
  const b = BASEMAPS[id];
  const vis = (layer: string) => (b.raster === layer ? 'visible' : 'none') as 'visible' | 'none';
  return {
    version: 8,
    glyphs: glyphs(),
    transition: { duration: 450, delay: 0 },
    sources: {
      'bm-dark': { type: 'raster', tiles: carto('dark_nolabels'), tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap contributors © CARTO' },
      'bm-light': { type: 'raster', tiles: carto('light_nolabels'), tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap contributors © CARTO' },
      'bm-imagery': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 18,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
      },
      'mm-outline': { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [MN_OUTLINE] } } },
      'mm-superior': { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [LAKE_SUPERIOR] } } },
      'mm-mask': { type: 'geojson', data: outsideMask() },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': b.background } },
      { id: 'mm-land', type: 'fill', source: 'mm-outline', paint: { 'fill-color': b.land, 'fill-antialias': false } },
      { id: 'mm-superior', type: 'fill', source: 'mm-superior', paint: { 'fill-color': b.water } },
      { id: 'bm-dark', type: 'raster', source: 'bm-dark', layout: { visibility: vis('bm-dark') }, paint: { 'raster-saturation': -0.2, 'raster-brightness-max': 0.92 } },
      { id: 'bm-light', type: 'raster', source: 'bm-light', layout: { visibility: vis('bm-light') } },
      { id: 'bm-imagery', type: 'raster', source: 'bm-imagery', layout: { visibility: vis('bm-imagery') }, paint: { 'raster-saturation': -0.15, 'raster-contrast': 0.08 } },
      // ↓ data layers are inserted here (before the mask) ↓
      { id: 'mm-mask', type: 'fill', source: 'mm-mask', paint: { 'fill-color': b.maskColor, 'fill-opacity': b.maskOpacity } },
      { id: 'mm-border-glow', type: 'line', source: 'mm-outline', paint: { 'line-color': b.border, 'line-width': 14, 'line-blur': 12, 'line-opacity': 0.22 } },
      { id: 'mm-border', type: 'line', source: 'mm-outline', paint: { 'line-color': b.border, 'line-width': 1.2, 'line-opacity': 0.75 } },
      // ↓ label / point overlays go above here ↓
      { id: 'mm-overlay-anchor', type: 'background', layout: { visibility: 'none' }, paint: { 'background-opacity': 0 } },
    ],
  };
}

/** Apply a basemap to an already-loaded style without rebuilding data layers. */
export function applyBasemap(map: MLMap, id: BasemapId) {
  const b = BASEMAPS[id];
  for (const l of RASTER_LAYERS) map.setLayoutProperty(l, 'visibility', b.raster === l ? 'visible' : 'none');
  map.setPaintProperty('background', 'background-color', b.background);
  map.setPaintProperty('mm-land', 'fill-color', b.land);
  map.setPaintProperty('mm-superior', 'fill-color', b.water);
  map.setPaintProperty('mm-mask', 'fill-color', b.maskColor);
  map.setPaintProperty('mm-mask', 'fill-opacity', b.maskOpacity);
  map.setPaintProperty('mm-border-glow', 'line-color', b.border);
  map.setPaintProperty('mm-border', 'line-color', b.border);
}

/** Where a layer is inserted: under the mask, or above everything for points/labels. */
export const BEFORE_MASK = 'mm-mask';
export const BEFORE_TOP = 'mm-overlay-anchor';
