// Geometry helpers + a simplified Minnesota outline.
// The outline is hand-simplified (~70 vertices) — good enough for masking and
// mock-data generation, NOT for analysis. Swap for TIGER/MnGeo boundaries later.

export type LngLat = [number, number];

export const MN_BOUNDS: [LngLat, LngLat] = [
  [-97.3, 43.45],
  [-89.4, 49.45],
];

export const MN_CENTER: LngLat = [-94.3, 46.35];

export const MN_OUTLINE: LngLat[] = [
  [-97.229, 49.0], [-95.153, 49.0], [-95.153, 49.384], [-94.95, 49.37],
  [-94.83, 49.3], [-94.74, 49.1], [-94.68, 48.88], [-94.69, 48.78],
  [-94.43, 48.7], [-94.1, 48.65], [-93.85, 48.63], [-93.46, 48.59],
  [-93.21, 48.64], [-92.95, 48.62], [-92.63, 48.5], [-92.37, 48.23],
  [-92.05, 48.36], [-91.71, 48.12], [-91.38, 48.06], [-90.84, 48.2],
  [-90.38, 48.1], [-89.99, 48.02], [-89.49, 48.0], [-89.88, 47.86],
  [-90.33, 47.75], [-90.75, 47.58], [-91.27, 47.29], [-91.67, 47.02],
  [-92.1, 46.78], [-92.29, 46.66], [-92.29, 46.08], [-92.42, 45.98],
  [-92.73, 45.87], [-92.88, 45.57], [-92.75, 45.42], [-92.8, 45.25],
  [-92.81, 45.06], [-92.76, 44.9], [-92.8, 44.75], [-92.53, 44.56],
  [-92.25, 44.45], [-92.03, 44.38], [-91.85, 44.19], [-91.64, 44.05],
  [-91.42, 43.95], [-91.3, 43.82], [-91.22, 43.5], [-92.5, 43.5],
  [-94.0, 43.5], [-95.5, 43.5], [-96.45, 43.5], [-96.45, 44.5],
  [-96.45, 45.3], [-96.56, 45.38], [-96.74, 45.48], [-96.84, 45.6],
  [-96.6, 45.83], [-96.57, 45.94], [-96.56, 46.3], [-96.6, 46.62],
  [-96.77, 46.87], [-96.82, 47.2], [-96.86, 47.6], [-96.98, 47.85],
  [-97.03, 47.92], [-97.14, 48.2], [-97.15, 48.55], [-97.23, 48.8],
  [-97.229, 49.0],
];

// Western Lake Superior (approximate), so the custom basemap reads as Minnesota
// even when remote raster tiles are unavailable.
export const LAKE_SUPERIOR: LngLat[] = [
  [-92.1, 46.78], [-91.67, 47.02], [-91.27, 47.29], [-90.75, 47.58],
  [-90.33, 47.75], [-89.88, 47.86], [-89.49, 48.0], [-89.1, 48.15],
  [-88.6, 48.5], [-87.8, 48.85], [-86.5, 48.8], [-85.5, 48.0],
  [-84.6, 46.9], [-86.0, 46.4], [-87.4, 46.5], [-88.4, 46.95],
  [-88.0, 47.4], [-88.9, 47.0], [-89.9, 46.8], [-90.8, 46.6],
  [-91.4, 46.7], [-92.0, 46.7], [-92.1, 46.78],
];

export function pointInPolygon([x, y]: LngLat, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const inMinnesota = (p: LngLat) => pointInPolygon(p, MN_OUTLINE);

/** Chaikin corner-cutting — turns coarse polylines into graceful curves. */
export function smooth(line: LngLat[], iterations = 3, closed = false): LngLat[] {
  let pts = line;
  for (let k = 0; k < iterations; k++) {
    const out: LngLat[] = closed ? [] : [pts[0]];
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) out.push(pts[pts.length - 1]);
    pts = out;
  }
  if (closed) pts.push(pts[0]);
  return pts;
}

/** Approximate distance in km (equirectangular — fine at state scale). */
export function distanceKm(a: LngLat, b: LngLat): number {
  const kx = 111.32 * Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180));
  const dx = (a[0] - b[0]) * kx;
  const dy = (a[1] - b[1]) * 110.57;
  return Math.sqrt(dx * dx + dy * dy);
}

export function lineLengthKm(line: LngLat[]): number {
  let d = 0;
  for (let i = 1; i < line.length; i++) d += distanceKm(line[i - 1], line[i]);
  return d;
}

// Web-mercator helpers for rendering canvas rasters that line up with the map.
export const mercY = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
export const latFromMercY = (y: number) =>
  (360 / Math.PI) * Math.atan(Math.exp(y)) - 90;

/** Flat-top hexagon grid clipped (by center) to Minnesota. */
export function hexGrid(radiusKm: number): { id: number; center: LngLat; ring: LngLat[] }[] {
  const latMid = 46.3;
  const kx = 111.32 * Math.cos((latMid * Math.PI) / 180);
  const ky = 110.57;
  const rx = radiusKm / kx;
  const ry = radiusKm / ky;
  const w = rx * 1.5;
  const h = ry * Math.sqrt(3);
  const [[x0, y0], [x1, y1]] = MN_BOUNDS;
  const cells: { id: number; center: LngLat; ring: LngLat[] }[] = [];
  let id = 0;
  for (let col = 0, x = x0; x <= x1; col++, x += w) {
    for (let y = y0 + (col % 2 ? h / 2 : 0); y <= y1; y += h) {
      const center: LngLat = [x, y];
      if (!inMinnesota(center)) continue;
      const ring: LngLat[] = [];
      for (let k = 0; k <= 6; k++) {
        const a = (Math.PI / 3) * (k % 6);
        ring.push([x + rx * Math.cos(a) * 0.96, y + ry * Math.sin(a) * 0.96]);
      }
      cells.push({ id: id++, center, ring });
    }
  }
  return cells;
}

/** World polygon with Minnesota cut out — used to dim everything outside the state. */
export function outsideMask(): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]],
        [...MN_OUTLINE].reverse(),
      ],
    },
  };
}
