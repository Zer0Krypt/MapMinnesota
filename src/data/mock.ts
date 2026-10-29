// Procedural MOCK datasets. Everything here is synthetic but shaped to feel
// plausible (urban gradients, north–south climate, lake country, etc.).
// Each generator is memoized and deterministic. Replace generator-by-generator
// with real sources as the data layer matures — layer configs don't care.

import {
  distanceKm,
  hexGrid,
  inMinnesota,
  type LngLat,
  MN_OUTLINE,
  smooth,
} from './geo';
import { CITIES, NAMED_LAKES, PARKS } from './places';
import { fbm, gaussian, mulberry32, range, type Rng } from './random';

type FC<G extends GeoJSON.Geometry = GeoJSON.Geometry> = GeoJSON.FeatureCollection<G>;

function memo<T>(fn: () => T): () => T {
  let v: T | undefined;
  return () => (v ??= fn());
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const METRO: LngLat = [-93.2, 44.97];
const COLLEGE_TOWNS = ['Mankato', 'St. Cloud', 'Winona', 'Northfield', 'Duluth', 'Moorhead', 'Bemidji'];

/** 0..~1 "how urban is this spot" from city populations. */
export function urbanIndex(p: LngLat): number {
  let u = 0;
  for (const c of CITIES) {
    const sigma = 5 + Math.sqrt(c.pop / 1000) * 1.1;
    const d = distanceKm(p, c.coord);
    u += (c.pop / 430000) * Math.exp(-((d / sigma) ** 2));
  }
  return u;
}

export function nearestCity(p: LngLat) {
  let best = CITIES[0];
  let bd = Infinity;
  for (const c of CITIES) {
    const d = distanceKm(p, c.coord);
    if (d < bd) [best, bd] = [c, d];
  }
  return { city: best, km: bd };
}

function randomPointInMN(rng: Rng, weight: (p: LngLat) => number, maxW = 1): LngLat {
  for (let i = 0; i < 10000; i++) {
    const p: LngLat = [range(rng, -97.25, -89.5), range(rng, 43.5, 49.38)];
    if (inMinnesota(p) && rng() * maxW < weight(p)) return p;
  }
  return [-94.3, 46.3];
}

function nearCity(rng: Rng, spreadKm: number): LngLat {
  // pick a city proportional to sqrt(pop) then scatter around it
  const total = CITIES.reduce((s, c) => s + Math.sqrt(c.pop), 0);
  let r = rng() * total;
  let city = CITIES[0];
  for (const c of CITIES) {
    r -= Math.sqrt(c.pop);
    if (r <= 0) {
      city = c;
      break;
    }
  }
  const s = spreadKm * (0.4 + Math.sqrt(city.pop / 430000));
  return [
    city.coord[0] + gaussian(rng, 0, s / 77),
    city.coord[1] + gaussian(rng, 0, s / 111),
  ];
}

/** Irregular closed blob, vertices pulled inside Minnesota when `clip` is set. */
function blob(rng: Rng, c: LngLat, rx: number, ry: number, rot = 0, jag = 0.25, n = 22, clip = false): LngLat[] {
  const seed = Math.floor(rng() * 1e6);
  const ring: LngLat[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (fbm(Math.cos(a) * 1.3 + 5, Math.sin(a) * 1.3 + 5, seed, 3) - 0.5) * 2 * jag;
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    let p: LngLat = [c[0] + x * Math.cos(rot) - y * Math.sin(rot), c[1] + x * Math.sin(rot) + y * Math.cos(rot)];
    if (clip && !inMinnesota(p)) {
      let t = 1;
      while (t > 0.05 && !inMinnesota(p)) {
        t -= 0.05;
        p = [c[0] + (p[0] - c[0]) * (t / (t + 0.05)), c[1] + (p[1] - c[1]) * (t / (t + 0.05))];
      }
    }
    ring.push(p);
  }
  return smooth(ring, 2, true);
}

const fmtYearSeries = (rng: Rng, start: number, end: number, base: number, drift: number, noise: number) => {
  const values: number[] = [];
  let v = base;
  for (let y = start; y <= end; y++) {
    values.push(v);
    v = v * (1 + drift + gaussian(rng, 0, noise));
  }
  return values;
};

// ---------------------------------------------------------------------------
// Census-style demographics on a hex grid
// ---------------------------------------------------------------------------

export const CENSUS_VARS = {
  density: { label: 'Population density', unit: 'people / sq mi' },
  income: { label: 'Median household income', unit: 'USD' },
  age: { label: 'Median age', unit: 'years' },
  change: { label: 'Population change 2010–20', unit: '%' },
} as const;
export type CensusVar = keyof typeof CENSUS_VARS;

export const censusHexes = memo((): FC<GeoJSON.Polygon> => {
  const rng = mulberry32(11);
  const features = hexGrid(11).map(({ id, center, ring }) => {
    const [lng, lat] = center;
    const u = urbanIndex(center);
    const noise = fbm(lng * 1.7, lat * 1.7, 3);
    const density = 2 + 30 * noise + 5200 * u;
    const dm = distanceKm(center, METRO);
    const roch = distanceKm(center, [-92.466, 44.022]);
    const income =
      56000 - (lat - 44) * 2600 + 40000 * Math.exp(-(((dm - 24) / 16) ** 2)) - 9000 * Math.exp(-((dm / 7) ** 2)) +
      16000 * Math.exp(-((roch / 22) ** 2)) + (noise - 0.5) * 16000;
    let college = 0;
    for (const c of CITIES) if (COLLEGE_TOWNS.includes(c.name)) college += Math.exp(-((distanceKm(center, c.coord) / 9) ** 2));
    const age = 47 - 9 * clamp01(u * 3) + (lat - 44) * 0.6 - 7 * college + (noise - 0.5) * 6;
    const change = -9 + 34 * Math.exp(-(((dm - 30) / 22) ** 2)) + 10 * clamp01(u * 2) - (lng < -95.5 ? 5 : 0) + (noise - 0.5) * 12;

    const n = {
      density: clamp01(Math.log(density / 2) / Math.log(4500 / 2)),
      income: clamp01((income - 38000) / (125000 - 38000)),
      age: clamp01((age - 28) / (56 - 28)),
      change: clamp01((change + 18) / 48),
    };
    const near = nearestCity(center);
    return {
      type: 'Feature' as const,
      id,
      properties: {
        id,
        place: near.km < 12 ? near.city.name : `${Math.round(near.km * 0.62)} mi from ${near.city.name}`,
        density: Math.round(density),
        income: Math.round(income / 100) * 100,
        age: Math.round(age * 10) / 10,
        change: Math.round(change * 10) / 10,
        n_density: n.density,
        n_income: n.income,
        n_age: n.age,
        n_change: n.change,
        crime: Math.round((9 + 26 * clamp01(u * 2.2) + (fbm(lng * 2.3, lat * 2.3, 9) - 0.5) * 14) * 10) / 10,
        cx: center[0],
        cy: center[1],
        seed: Math.floor(rng() * 1e6),
      },
      geometry: { type: 'Polygon' as const, coordinates: [ring] },
    };
  });
  return { type: 'FeatureCollection', features };
});

/** Per-capita crime rate on hex centers (proportional symbols). */
export const crimePoints = memo((): FC<GeoJSON.Point> => ({
  type: 'FeatureCollection',
  features: censusHexes().features.map((f) => {
    const p = f.properties!;
    const rng = mulberry32(p.seed);
    return {
      type: 'Feature',
      id: p.id,
      properties: {
        place: p.place,
        rate: p.crime,
        n: clamp01((p.crime - 4) / 36),
        violent: Math.round(range(rng, 12, 32)),
        pop: Math.round(p.density * 46),
        trend: Math.round(gaussian(rng, -3, 7) * 10) / 10,
        seed: p.seed,
      },
      geometry: { type: 'Point', coordinates: [p.cx, p.cy] },
    };
  }),
}));

export function censusSeries(seed: number, density: number, change: number) {
  const rng = mulberry32(seed);
  const pop = density * 46; // ~hex area in sq mi
  return fmtYearSeries(rng, 2000, 2023, pop / (1 + change / 100) ** 1.3, change / 1300, 0.006);
}

// ---------------------------------------------------------------------------
// Continuous fields (rendered to canvas rasters)
// ---------------------------------------------------------------------------

const SUPERIOR_SHORE: LngLat[] = [[-92.1, 46.78], [-91.67, 47.02], [-91.27, 47.29], [-90.75, 47.58], [-90.33, 47.75], [-89.88, 47.86]];

/** Mock "this afternoon" air temperature, °F. */
export function temperatureAt(p: LngLat): number {
  const [lng, lat] = p;
  let shore = Infinity;
  for (const s of SUPERIOR_SHORE) shore = Math.min(shore, distanceKm(p, s));
  return (
    63 - (lat - 43.5) * 3.1 + (lng + 94) * -0.35 + 3.2 * clamp01(urbanIndex(p) * 2.5) -
    9 * Math.exp(-((shore / 28) ** 2)) + (fbm(lng * 0.9, lat * 0.9, 21) - 0.5) * 7
  );
}

/** Mock forest canopy fraction 0..1. */
export function forestAt(p: LngLat): number {
  const [lng, lat] = p;
  const northEast = 1 / (1 + Math.exp(-((lat - 46.1) * 2.2 + (lng + 94.8) * 0.9)));
  const driftless = Math.exp(-(((lng + 91.9) / 0.6) ** 2 + ((lat - 43.95) / 0.5) ** 2)) * 0.55;
  const redRiver = 0.15 + 0.85 / (1 + Math.exp(-(lng + 96.0) * 5));
  const tex = fbm(lng * 3.2, lat * 3.2, 7, 5);
  const urban = 1 - clamp01(urbanIndex(p) * 2);
  return clamp01((northEast * 0.95 + driftless) * redRiver * urban * (0.45 + tex * 0.9));
}

// ---------------------------------------------------------------------------
// Hydrography
// ---------------------------------------------------------------------------

const LAKE_WORDS = ['Long', 'Mud', 'Round', 'Clear', 'Bass', 'Pike', 'Loon', 'Spirit', 'Island', 'Birch', 'Cedar', 'Rice', 'Sand', 'Bear', 'Eagle', 'Moose', 'Turtle', 'Crooked', 'Horseshoe', 'Sunfish', 'Pelican', 'Big Sandy', 'Little Bass', 'Lost', 'Mirror', 'Fish', 'Twin', 'Silver', 'Deer', 'Trout', 'Elbow', 'Star', 'Pine', 'Balsam', 'Grindstone', 'Whitefish', 'Kabekona', 'Ottertail', 'Wolf', 'Swan'];
const FISH = ['Walleye', 'Northern pike', 'Muskellunge', 'Largemouth bass', 'Smallmouth bass', 'Bluegill', 'Crappie', 'Yellow perch', 'Lake trout', 'Tullibee'];

function lakeiness(p: LngLat) {
  const [lng, lat] = p;
  const central = Math.exp(-(((lat - 46.9) / 1.1) ** 2 + ((lng + 94.5) / 1.6) ** 2));
  const arrowhead = Math.exp(-(((lat - 47.9) / 0.45) ** 2 + ((lng + 91.3) / 1.0) ** 2));
  const metro = Math.exp(-(((lat - 45.0) / 0.35) ** 2 + ((lng + 93.4) / 0.5) ** 2)) * 0.6;
  const south = Math.exp(-(((lat - 43.85) / 0.5) ** 2 + ((lng + 94.8) / 0.9) ** 2)) * 0.35;
  return clamp01((central + arrowhead + metro + south) * (0.35 + fbm(lng * 4, lat * 4, 31) * 1.1));
}

export const lakes = memo((): FC<GeoJSON.Polygon> => {
  const rng = mulberry32(5);
  const feats: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  const lakeProps = (name: string, acres: number) => {
    const fish = [...FISH].sort(() => rng() - 0.5).slice(0, 2 + Math.floor(rng() * 3));
    return {
      name,
      acres: Math.round(acres),
      depth: Math.round(range(rng, 12, 40) + Math.sqrt(acres) * range(rng, 0.2, 0.7)),
      clarity: Math.round(range(rng, 3, 22) * 10) / 10,
      fish: fish.join(', '),
      seed: Math.floor(rng() * 1e6),
    };
  };
  for (const l of NAMED_LAKES) {
    const ring = blob(rng, l.center, l.rx, l.ry, l.rot, 0.22, 26);
    feats.push({ type: 'Feature', properties: { ...lakeProps(l.name, l.rx * l.ry * 2.5e5), major: 1 }, geometry: { type: 'Polygon', coordinates: [ring] } });
  }
  for (let i = 0; i < 520; i++) {
    const c = randomPointInMN(rng, lakeiness);
    const r = 0.006 + rng() ** 3 * 0.05;
    const ring = blob(rng, c, r * 1.35, r, rng() * Math.PI, 0.35, 14);
    const name = `${LAKE_WORDS[Math.floor(rng() * LAKE_WORDS.length)]} Lake`;
    feats.push({ type: 'Feature', properties: { ...lakeProps(name, r * r * 1.3e6), major: 0 }, geometry: { type: 'Polygon', coordinates: [ring] } });
  }
  return { type: 'FeatureCollection', features: feats };
});

const RIVERS: { name: string; order: 1 | 2; pts: LngLat[] }[] = [
  { name: 'Mississippi River', order: 1, pts: [[-95.21, 47.24], [-95.05, 47.4], [-94.88, 47.47], [-94.62, 47.42], [-94.25, 47.4], [-93.95, 47.3], [-93.53, 47.23], [-93.62, 46.85], [-93.7, 46.53], [-94.2, 46.36], [-94.36, 45.98], [-94.16, 45.56], [-93.57, 45.3], [-93.39, 45.2], [-93.26, 44.98], [-93.2, 44.9], [-93.09, 44.94], [-92.85, 44.74], [-92.53, 44.57], [-92.25, 44.45], [-92.03, 44.38], [-91.64, 44.05], [-91.3, 43.83], [-91.22, 43.5]] },
  { name: 'Minnesota River', order: 1, pts: [[-96.45, 45.3], [-95.72, 44.95], [-95.54, 44.81], [-95.12, 44.54], [-94.46, 44.31], [-94.0, 44.17], [-93.96, 44.32], [-93.91, 44.46], [-93.63, 44.67], [-93.52, 44.8], [-93.2, 44.88]] },
  { name: 'St. Croix River', order: 1, pts: [[-92.3, 46.1], [-92.42, 45.98], [-92.7, 45.86], [-92.76, 45.62], [-92.66, 45.4], [-92.76, 45.22], [-92.8, 45.05], [-92.76, 44.9], [-92.8, 44.75]] },
  { name: 'Red River of the North', order: 1, pts: [[-96.57, 46.27], [-96.6, 46.62], [-96.77, 46.87], [-96.82, 47.2], [-96.86, 47.6], [-96.98, 47.85], [-97.03, 47.92], [-97.14, 48.2], [-97.15, 48.55], [-97.23, 49.0]] },
  { name: 'St. Louis River', order: 2, pts: [[-92.05, 47.6], [-92.45, 47.3], [-92.7, 47.05], [-92.55, 46.8], [-92.46, 46.72], [-92.3, 46.66], [-92.15, 46.73]] },
  { name: 'Rainy River', order: 2, pts: [[-93.4, 48.6], [-93.85, 48.63], [-94.1, 48.65], [-94.43, 48.7], [-94.69, 48.78]] },
  { name: 'Red Lake River', order: 2, pts: [[-95.25, 47.98], [-95.7, 48.05], [-96.18, 48.12], [-96.4, 47.9], [-96.6, 47.77], [-97.03, 47.92]] },
  { name: 'Crow Wing River', order: 2, pts: [[-95.05, 46.95], [-94.95, 46.72], [-94.8, 46.55], [-94.33, 46.3]] },
  { name: 'Root River', order: 2, pts: [[-92.6, 43.75], [-92.2, 43.7], [-91.9, 43.72], [-91.3, 43.8]] },
  { name: 'Cannon River', order: 2, pts: [[-93.45, 44.3], [-93.16, 44.46], [-92.9, 44.51], [-92.62, 44.58]] },
  { name: 'Zumbro River', order: 2, pts: [[-92.75, 44.15], [-92.45, 44.25], [-92.2, 44.3], [-92.0, 44.37]] },
  { name: 'Crow River', order: 2, pts: [[-94.6, 45.1], [-94.25, 45.05], [-93.9, 45.15], [-93.57, 45.3]] },
  { name: 'Blue Earth River', order: 2, pts: [[-94.1, 43.6], [-94.05, 43.85], [-94.05, 44.05], [-94.0, 44.17]] },
  { name: 'Rum River', order: 2, pts: [[-93.7, 46.1], [-93.62, 45.75], [-93.58, 45.57], [-93.39, 45.2]] },
];

export const rivers = memo((): FC<GeoJSON.LineString> => {
  const rng = mulberry32(8);
  return {
    type: 'FeatureCollection',
    features: RIVERS.map((r) => ({
      type: 'Feature',
      properties: { name: r.name, order: r.order, flow: Math.round((r.order === 1 ? range(rng, 2500, 24000) : range(rng, 300, 2400)) / 10) * 10 },
      geometry: { type: 'LineString', coordinates: smooth(r.pts, 3) },
    })),
  };
});

// ---------------------------------------------------------------------------
// Transportation
// ---------------------------------------------------------------------------

const RING = Array.from({ length: 33 }, (_, i): LngLat => {
  const a = (i / 32) * Math.PI * 2;
  return [-93.21 + Math.cos(a) * 0.255, 44.985 + Math.sin(a) * 0.15];
});

const ROUTES: { name: string; cls: 'Interstate' | 'US Highway'; pts: LngLat[] }[] = [
  { name: 'I-35', cls: 'Interstate', pts: [[-92.1, 46.79], [-92.47, 46.72], [-92.75, 46.15], [-92.95, 45.65], [-93.02, 45.25]] },
  { name: 'I-35E', cls: 'Interstate', pts: [[-93.02, 45.25], [-93.06, 45.08], [-93.09, 44.95], [-93.17, 44.82], [-93.25, 44.7]] },
  { name: 'I-35W', cls: 'Interstate', pts: [[-93.02, 45.25], [-93.2, 45.1], [-93.27, 44.98], [-93.28, 44.84], [-93.25, 44.7]] },
  { name: 'I-35', cls: 'Interstate', pts: [[-93.25, 44.7], [-93.27, 44.3], [-93.24, 44.08], [-93.33, 43.67], [-93.35, 43.5]] },
  { name: 'I-94', cls: 'Interstate', pts: [[-96.77, 46.87], [-96.08, 46.28], [-95.38, 45.88], [-94.95, 45.74], [-94.2, 45.55], [-93.75, 45.3], [-93.45, 45.1], [-93.28, 44.98], [-93.09, 44.95], [-92.96, 44.94], [-92.77, 44.96]] },
  { name: 'I-90', cls: 'Interstate', pts: [[-96.45, 43.62], [-95.6, 43.63], [-94.46, 43.65], [-94.1, 43.66], [-93.37, 43.66], [-92.97, 43.68], [-92.45, 43.86], [-91.95, 43.88], [-91.3, 43.8]] },
  { name: 'I-494 / I-694', cls: 'Interstate', pts: RING },
  { name: 'US-10', cls: 'US Highway', pts: [[-96.77, 46.87], [-95.85, 46.82], [-95.14, 46.44], [-94.79, 46.36], [-94.36, 45.98], [-94.17, 45.56], [-93.57, 45.3], [-93.39, 45.2], [-93.25, 45.13]] },
  { name: 'US-2', cls: 'US Highway', pts: [[-97.03, 47.93], [-96.61, 47.77], [-95.9, 47.6], [-94.88, 47.47], [-94.6, 47.38], [-93.53, 47.24], [-92.92, 46.93], [-92.15, 46.77]] },
  { name: 'US-169', cls: 'US Highway', pts: [[-94.0, 44.17], [-93.95, 44.32], [-93.52, 44.79], [-93.4, 44.97], [-93.45, 45.2], [-93.58, 45.57], [-93.65, 45.75], [-93.83, 46.29], [-93.71, 46.53], [-93.53, 47.24], [-92.94, 47.43], [-92.54, 47.52], [-91.87, 47.9]] },
  { name: 'US-52', cls: 'US Highway', pts: [[-93.09, 44.93], [-92.9, 44.51], [-92.6, 44.25], [-92.47, 44.03], [-92.05, 43.65], [-91.85, 43.5]] },
  { name: 'MN-61', cls: 'US Highway', pts: [[-92.1, 46.8], [-91.67, 47.04], [-91.27, 47.3], [-90.75, 47.59], [-90.33, 47.76], [-89.88, 47.87], [-89.68, 47.96]] },
  { name: 'US-14', cls: 'US Highway', pts: [[-92.47, 44.03], [-93.24, 44.08], [-94.0, 44.17], [-94.46, 44.31], [-95.12, 44.4], [-95.79, 44.45], [-96.45, 44.32]] },
  { name: 'US-71', cls: 'US Highway', pts: [[-95.6, 43.62], [-95.2, 44.4], [-95.04, 45.12], [-94.95, 45.74], [-95.14, 46.44], [-95.06, 46.92], [-94.88, 47.47], [-94.4, 48.0], [-93.41, 48.6]] },
  { name: 'US-53', cls: 'US Highway', pts: [[-92.1, 46.79], [-92.42, 47.1], [-92.54, 47.52], [-92.8, 48.0], [-93.41, 48.6]] },
  { name: 'US-12', cls: 'US Highway', pts: [[-93.4, 44.98], [-93.85, 45.0], [-94.37, 45.05], [-95.04, 45.12], [-95.7, 45.15], [-96.45, 45.18]] },
];

export const highways = memo((): FC<GeoJSON.LineString> => {
  const rng = mulberry32(3);
  const feats: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  for (const r of ROUTES) {
    const line = smooth(r.pts, 2, false);
    const chunk = 6;
    for (let i = 0; i < line.length - 1; i += chunk) {
      const seg = line.slice(i, Math.min(line.length, i + chunk + 1));
      const mid = seg[Math.floor(seg.length / 2)];
      const u = clamp01(urbanIndex(mid) * 1.6);
      const base = r.cls === 'Interstate' ? 21000 : 6500;
      const aadt = Math.round((base * (1 + u * 7.5) * range(rng, 0.8, 1.25)) / 100) * 100;
      feats.push({
        type: 'Feature',
        properties: {
          name: r.name,
          cls: r.cls,
          aadt,
          n: clamp01(Math.log(aadt / 3000) / Math.log(170000 / 3000)),
          speed: Math.round(r.cls === 'Interstate' ? 70 - u * 28 * rng() : 60 - u * 20 * rng()),
          seed: Math.floor(rng() * 1e6),
        },
        geometry: { type: 'LineString', coordinates: seg },
      });
    }
  }
  return { type: 'FeatureCollection', features: feats };
});

export function trafficSeries(seed: number, aadt: number) {
  // 24h volume profile with AM/PM peaks
  const rng = mulberry32(seed);
  return Array.from({ length: 24 }, (_, h) => {
    const peaks = Math.exp(-(((h - 7.8) / 1.4) ** 2)) * 1.0 + Math.exp(-(((h - 17) / 1.8) ** 2)) * 1.15;
    const day = h >= 6 && h <= 21 ? 0.55 : 0.12;
    return Math.round((aadt / 24) * (day + peaks) * range(rng, 0.92, 1.08));
  });
}

const BLUE_LINE: [string, LngLat][] = [['Target Field', [-93.277, 44.983]], ['Nicollet Mall', [-93.272, 44.978]], ['U.S. Bank Stadium', [-93.259, 44.975]], ['Cedar-Riverside', [-93.247, 44.968]], ['Franklin Ave', [-93.247, 44.962]], ['Lake St/Midtown', [-93.239, 44.948]], ['38th St', [-93.229, 44.934]], ['46th St', [-93.219, 44.92]], ['VA Medical Center', [-93.202, 44.903]], ['Fort Snelling', [-93.198, 44.893]], ['MSP Airport', [-93.206, 44.881]], ['American Blvd', [-93.223, 44.858]], ['Mall of America', [-93.239, 44.854]]];
const GREEN_LINE: [string, LngLat][] = [['Target Field', [-93.277, 44.983]], ['Nicollet Mall', [-93.272, 44.978]], ['U.S. Bank Stadium', [-93.259, 44.975]], ['West Bank', [-93.246, 44.972]], ['East Bank', [-93.231, 44.974]], ['Stadium Village', [-93.223, 44.975]], ['Prospect Park', [-93.215, 44.972]], ['Raymond Ave', [-93.196, 44.963]], ['Snelling Ave', [-93.167, 44.956]], ['Lexington Pkwy', [-93.146, 44.956]], ['Capitol/Rice St', [-93.105, 44.956]], ['Central', [-93.093, 44.946]], ['Union Depot', [-93.086, 44.948]]];

export const transit = memo(() => {
  const rng = mulberry32(17);
  const lines: FC<GeoJSON.LineString> = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { name: 'METRO Blue Line', color: '#3b82f6' }, geometry: { type: 'LineString', coordinates: smooth(BLUE_LINE.map((s) => s[1]), 2) } },
      { type: 'Feature', properties: { name: 'METRO Green Line', color: '#22c55e' }, geometry: { type: 'LineString', coordinates: smooth(GREEN_LINE.map((s) => s[1]), 2) } },
    ],
  };
  const seen = new Set<string>();
  const stations: FC<GeoJSON.Point> = { type: 'FeatureCollection', features: [] };
  for (const [line, list, color] of [['Blue', BLUE_LINE, '#3b82f6'], ['Green', GREEN_LINE, '#22c55e']] as const) {
    for (const [name, coord] of list) {
      if (seen.has(name)) continue;
      seen.add(name);
      stations.features.push({
        type: 'Feature',
        properties: { name, line: GREEN_LINE.some((g) => g[0] === name) && line === 'Blue' ? 'Blue + Green' : line, color, boardings: Math.round(range(rng, 400, 6500)) },
        geometry: { type: 'Point', coordinates: coord },
      });
    }
  }
  return { lines, stations };
});

// ---------------------------------------------------------------------------
// Points of interest
// ---------------------------------------------------------------------------

const AMENITIES = ['Camping', 'Hiking', 'Swimming', 'Fishing', 'Canoeing', 'Ski trails', 'Bike trails', 'Waterfall', 'Visitor center', 'Snowmobiling', 'Birding'];

export const parks = memo((): FC<GeoJSON.Point> => {
  const rng = mulberry32(23);
  return {
    type: 'FeatureCollection',
    features: PARKS.map((p) => {
      const visitors = Math.round(range(rng, 60, 1200)) * 1000;
      return {
        type: 'Feature',
        properties: {
          name: p.name,
          kind: p.kind,
          acres: Math.round(range(rng, 800, 33000) / 10) * 10,
          visitors,
          v: clamp01(visitors / 1200000),
          est: Math.floor(range(rng, 1891, 1990)),
          amenities: [...AMENITIES].sort(() => rng() - 0.5).slice(0, 3 + Math.floor(rng() * 3)).join(', '),
          seed: Math.floor(rng() * 1e6),
        },
        geometry: { type: 'Point', coordinates: p.coord },
      };
    }),
  };
});

export const cityPoints = memo((): FC<GeoJSON.Point> => ({
  type: 'FeatureCollection',
  features: CITIES.map((c) => ({
    type: 'Feature',
    properties: { name: c.name, pop: c.pop, tier: c.tier },
    geometry: { type: 'Point', coordinates: c.coord },
  })),
}));

const TEMP_STATIONS = ['Owatonna', 'Albert Lea', 'Red Wing', 'Hibbing', 'Ely', 'Fergus Falls', 'Thief River Falls', 'Worthington', 'New Ulm', 'Detroit Lakes', 'Two Harbors', 'Roseau', 'Pipestone', 'Park Rapids', 'Crookston'];

export const temperatureReadings = memo((): FC<GeoJSON.Point> => ({
  type: 'FeatureCollection',
  features: CITIES.filter((c) => c.tier < 3 || TEMP_STATIONS.includes(c.name)).map((c) => {
    const t = Math.round(temperatureAt(c.coord));
    return {
      type: 'Feature',
      properties: { name: c.name, temp: t, label: `${t}°`, tier: c.tier },
      geometry: { type: 'Point', coordinates: c.coord },
    };
  }),
}));

export const MPCA_TYPES = [
  { key: 'Leak site', color: '#f59e0b' },
  { key: 'Brownfield', color: '#a78bfa' },
  { key: 'Air permit', color: '#38bdf8' },
  { key: 'Water permit', color: '#2dd4bf' },
  { key: 'Hazardous waste', color: '#f43f5e' },
  { key: 'Solid waste', color: '#a3e635' },
] as const;

export const mpcaSites = memo((): FC<GeoJSON.Point> => {
  const rng = mulberry32(41);
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (let i = 0; i < 1400; i++) {
    const p = rng() < 0.78 ? nearCity(rng, 9) : randomPointInMN(rng, () => 1);
    if (!inMinnesota(p)) continue;
    const t = MPCA_TYPES[Math.floor(rng() ** 1.3 * MPCA_TYPES.length)];
    const status = rng() < 0.55 ? 'Active' : rng() < 0.6 ? 'Inactive' : 'Cleanup complete';
    features.push({
      type: 'Feature',
      properties: {
        id: `MN-${String(10000 + i * 7).padStart(6, '0')}`,
        type: t.key,
        color: t.color,
        status,
        since: Math.floor(range(rng, 1984, 2025)),
        near: nearestCity(p).city.name,
      },
      geometry: { type: 'Point', coordinates: p },
    });
  }
  return { type: 'FeatureCollection', features };
});

// ---------------------------------------------------------------------------
// Public land ownership
// ---------------------------------------------------------------------------

export const OWNERS = [
  { key: 'Federal', color: '#7c9cff' },
  { key: 'State', color: '#4ade80' },
  { key: 'County / tax-forfeit', color: '#facc15' },
  { key: 'Tribal', color: '#f472b6' },
  { key: 'Wildlife Mgmt Area', color: '#fb923c' },
] as const;

const NAMED_LANDS: { name: string; owner: (typeof OWNERS)[number]['key']; c: LngLat; rx: number; ry: number; rot?: number }[] = [
  { name: 'Superior National Forest', owner: 'Federal', c: [-91.35, 47.78], rx: 1.15, ry: 0.32, rot: 0.12 },
  { name: 'Chippewa National Forest', owner: 'Federal', c: [-94.1, 47.45], rx: 0.32, ry: 0.22 },
  { name: 'Voyageurs National Park', owner: 'Federal', c: [-92.85, 48.5], rx: 0.4, ry: 0.09, rot: 0.1 },
  { name: 'Red Lake Nation', owner: 'Tribal', c: [-95.15, 47.95], rx: 0.55, ry: 0.22 },
  { name: 'Leech Lake Reservation', owner: 'Tribal', c: [-94.45, 47.12], rx: 0.22, ry: 0.15, rot: -0.3 },
  { name: 'White Earth Nation', owner: 'Tribal', c: [-95.8, 47.15], rx: 0.22, ry: 0.17 },
  { name: 'Bois Forte Band', owner: 'Tribal', c: [-93.0, 48.05], rx: 0.18, ry: 0.1 },
  { name: 'Fond du Lac Band', owner: 'Tribal', c: [-92.65, 46.78], rx: 0.14, ry: 0.07 },
  { name: 'Mille Lacs Band', owner: 'Tribal', c: [-93.72, 46.05], rx: 0.07, ry: 0.05 },
  { name: 'Grand Portage Band', owner: 'Tribal', c: [-89.8, 47.93], rx: 0.15, ry: 0.05 },
  { name: 'Paul Bunyan State Forest', owner: 'State', c: [-95.0, 47.12], rx: 0.15, ry: 0.12 },
  { name: 'George Washington State Forest', owner: 'State', c: [-93.1, 47.6], rx: 0.25, ry: 0.13 },
  { name: 'Kabetogama State Forest', owner: 'State', c: [-92.6, 48.15], rx: 0.3, ry: 0.12 },
  { name: 'Finland State Forest', owner: 'State', c: [-91.35, 47.4], rx: 0.17, ry: 0.08, rot: 0.6 },
  { name: 'Savanna State Forest', owner: 'State', c: [-93.15, 46.85], rx: 0.18, ry: 0.12 },
  { name: 'Nemadji State Forest', owner: 'State', c: [-92.45, 46.3], rx: 0.13, ry: 0.13 },
  { name: 'Pillsbury State Forest', owner: 'State', c: [-94.48, 46.45], rx: 0.07, ry: 0.06 },
  { name: 'Richard J. Dorer Memorial Hardwood SF', owner: 'State', c: [-91.85, 43.98], rx: 0.35, ry: 0.22, rot: 0.6 },
  { name: 'Beltrami Island State Forest', owner: 'State', c: [-95.0, 48.6], rx: 0.4, ry: 0.18 },
];

export const publicLands = memo((): FC<GeoJSON.Polygon> => {
  const rng = mulberry32(61);
  const feats: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  const push = (name: string, owner: string, ring: LngLat[]) => {
    const color = OWNERS.find((o) => o.key === owner)!.color;
    let area = 0;
    for (let i = 1; i < ring.length; i++) area += ring[i - 1][0] * ring[i][1] - ring[i][0] * ring[i - 1][1];
    feats.push({
      type: 'Feature',
      properties: { name, owner, color, acres: Math.round(Math.abs(area / 2) * 77 * 111 * 247.1 / 10) * 10, parcel: `PIN ${Math.floor(range(rng, 10, 99))}-${Math.floor(range(rng, 100, 999))}-${Math.floor(range(rng, 1000, 9999))}` },
      geometry: { type: 'Polygon', coordinates: [ring] },
    });
  };
  for (const l of NAMED_LANDS) push(l.name, l.owner, blob(rng, l.c, l.rx, l.ry, l.rot ?? 0, 0.3, 30, true));
  for (let i = 0; i < 110; i++) {
    const north = rng() < 0.6;
    const c = randomPointInMN(rng, (p) => (north ? (p[1] > 46.2 ? 1 : 0.05) : p[0] < -94 && p[1] < 46.5 ? 1 : 0.1));
    const owner = north ? 'County / tax-forfeit' : 'Wildlife Mgmt Area';
    const r = north ? range(rng, 0.03, 0.09) : range(rng, 0.012, 0.035);
    push(`${nearestCity(c).city.name} ${north ? 'County Memorial Forest' : 'WMA'} #${i + 1}`, owner, blob(rng, c, r * 1.3, r, rng() * 3, 0.35, 16, true));
  }
  return { type: 'FeatureCollection', features: feats };
});

// ---------------------------------------------------------------------------
// Animated phenomena (positions computed per frame from fixed seeds)
// ---------------------------------------------------------------------------

interface StormCell { x: number; y: number; rx: number; ry: number; rot: number; pts: { dx: number; dy: number; w: number; ph: number }[] }

export const stormCells = memo((): StormCell[] => {
  const rng = mulberry32(71);
  const cells: StormCell[] = [];
  // a long squall line + scattered cells
  const specs = [
    { x: -97.6, y: 45.2, rx: 0.35, ry: 1.8, rot: -0.35, n: 420 },
    { x: -95.2, y: 47.6, rx: 0.6, ry: 0.4, rot: 0.2, n: 120 },
    { x: -93.6, y: 44.0, rx: 0.5, ry: 0.35, rot: 0.6, n: 110 },
    { x: -91.8, y: 46.6, rx: 0.7, ry: 0.45, rot: -0.2, n: 130 },
    { x: -96.0, y: 43.9, rx: 0.4, ry: 0.3, rot: 0, n: 80 },
    { x: -92.6, y: 48.4, rx: 0.5, ry: 0.3, rot: 0.3, n: 90 },
  ];
  for (const s of specs) {
    const pts = Array.from({ length: s.n }, () => {
      const dx = gaussian(rng, 0, s.rx * 0.5);
      const dy = gaussian(rng, 0, s.ry * 0.5);
      const core = Math.exp(-((dx / s.rx) ** 2 + (dy / s.ry) ** 2) * 2.2);
      return { dx, dy, w: 0.25 + core * range(rng, 0.6, 1.2), ph: rng() * Math.PI * 2 };
    });
    cells.push({ x: s.x, y: s.y, rx: s.rx, ry: s.ry, rot: s.rot, pts });
  }
  return cells;
});

/** Radar frame at time t (hours since loop start). */
export function radarFrame(t: number): FC<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  const span = 10.5; // degrees of longitude travel per loop
  for (const c of stormCells()) {
    const x0 = ((c.x + 98.5 + t * 1.6) % span) - 98.5;
    const y0 = c.y + t * 0.35 * Math.sin(c.x);
    for (const p of c.pts) {
      const dx = p.dx * Math.cos(c.rot) - p.dy * Math.sin(c.rot);
      const dy = p.dx * Math.sin(c.rot) + p.dy * Math.cos(c.rot);
      const w = p.w * (0.75 + 0.25 * Math.sin(t * 3 + p.ph));
      features.push({ type: 'Feature', properties: { w }, geometry: { type: 'Point', coordinates: [x0 + dx, y0 + dy] } });
    }
  }
  return { type: 'FeatureCollection', features };
}

const AURORA_N = 170;
const AURORA_RAYS = 6;

/** Two undulating curtains; each column fades as it rises north (ray structure). */
export function auroraFrame(t: number): FC<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (let band = 0; band < 2; band++) {
    for (let i = 0; i <= AURORA_N; i++) {
      const u = i / AURORA_N;
      const lng = -98.6 + u * 11.5;
      const lat0 =
        47.55 + band * 0.75 +
        Math.sin(u * 9 + t * 0.35 + band * 2) * 0.32 +
        Math.sin(u * 23 - t * 0.8) * 0.08;
      const glow =
        (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(u * 17 - t * 1.3 + band))) * (0.7 + 0.3 * Math.sin(u * 5 + t * 0.5)) *
        (band === 0 ? 1 : 0.65);
      for (let k = 0; k < AURORA_RAYS; k++) {
        features.push({
          type: 'Feature',
          properties: { w: glow * (1 - k / AURORA_RAYS) ** 1.4 },
          geometry: { type: 'Point', coordinates: [lng, lat0 + k * 0.085] },
        });
      }
    }
  }
  return { type: 'FeatureCollection', features };
}

export const mnOutlineFeature = memo((): GeoJSON.Feature<GeoJSON.Polygon> => ({
  type: 'Feature',
  properties: { name: 'Minnesota' },
  geometry: { type: 'Polygon', coordinates: [MN_OUTLINE] },
}));
