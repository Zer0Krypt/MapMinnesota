import type { GeoJSONSourceSpecification, Map as MLMap } from 'maplibre-gl';

export const FONT = {
  regular: ['Noto Sans Regular'],
  medium: ['Noto Sans Medium'],
  italic: ['Noto Sans Italic'],
};

export function addGeoJSON(map: MLMap, id: string, data: GeoJSON.GeoJSON, extra: Record<string, unknown> = {}) {
  if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data, ...extra } as GeoJSONSourceSpecification);
}

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
export const fmtCompact = (n: number) =>
  Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
export const fmtUSD = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
export const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

/** Lighten text/halos on light basemaps. */
export const isLight = (basemap: string) => basemap === 'daylight';
