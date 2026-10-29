import type { Map as MLMap } from 'maplibre-gl';
import { RAMPS, sampleRamp } from '../data/color';
import { CENSUS_VARS, type CensusVar, censusHexes, censusSeries } from '../data/mock';
import type { Legend, LayerDef, LayerOptions } from './types';
import { fmtCompact, fmtInt, fmtPct, fmtUSD } from './util';

const VAR_STYLE: Record<CensusVar, { ramp: string[]; labels: string[]; accent: string }> = {
  density: { ramp: RAMPS.aurora, labels: ['2', '100', '4,500+'], accent: '#4cc9a0' },
  income: { ramp: RAMPS.ember, labels: ['$38k', '$80k', '$125k+'], accent: '#f7a35c' },
  age: { ramp: RAMPS.lichen, labels: ['28', '42', '56'], accent: '#7cc4a4' },
  change: { ramp: RAMPS.divergingChange, labels: ['−18%', '+6%', '+30%'], accent: '#6fa8d6' },
};

const rgb = (c: [number, number, number]) => `rgb(${c.map(Math.round).join(',')})`;

let tween = 0;

/** Morph colors + heights from one variable to another via feature-state. */
function transitionTo(map: MLMap, to: CensusVar, from: CensusVar | null, ms = 900) {
  const feats = censusHexes().features;
  const id = ++tween;
  const start = performance.now();
  const step = (now: number) => {
    if (id !== tween || !map.getSource('census')) return;
    const k = from ? Math.min(1, (now - start) / ms) : 1;
    const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2; // easeInOutCubic
    for (const f of feats) {
      const p = f.properties!;
      const nTo = p[`n_${to}`] as number;
      const nFrom = from ? (p[`n_${from}`] as number) : nTo;
      const cTo = sampleRamp(VAR_STYLE[to].ramp, nTo);
      const cFrom = from ? sampleRamp(VAR_STYLE[from].ramp, nFrom) : cTo;
      const c: [number, number, number] = [0, 1, 2].map((i) => cFrom[i] + (cTo[i] - cFrom[i]) * e) as [number, number, number];
      map.setFeatureState({ source: 'census', id: f.id! }, { c: rgb(c), h: nFrom + (nTo - nFrom) * e });
    }
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export const census: LayerDef = {
  id: 'census',
  name: 'Census demographics',
  category: 'people',
  description: 'ACS 5-year estimates summarized to a hex grid. Switch variables to watch the map morph; try 3D.',
  mock: true,
  source: { name: 'US Census Bureau — ACS 5-year', url: 'https://www.census.gov/data/developers/data-sets/acs-5year.html' },
  defaultVisible: false,
  defaultOpacity: 0.85,
  options: [
    { key: 'var', label: 'Variable', type: 'select', choices: (Object.keys(CENSUS_VARS) as CensusVar[]).map((k) => ({ value: k, label: CENSUS_VARS[k].label })) },
    { key: 'extrude', label: '3D columns', type: 'toggle' },
  ],
  defaultOptions: { var: 'density', extrude: false },
  legend: (o: LayerOptions): Legend => {
    const v = o.var as CensusVar;
    return { kind: 'gradient', ramp: VAR_STYLE[v].ramp, labels: VAR_STYLE[v].labels, unit: CENSUS_VARS[v].unit };
  },
  mapLayers: ['census-fill', 'census-line', 'census-3d'],
  layersFor: (o) => (o.extrude ? ['census-3d'] : ['census-fill', 'census-line']),
  interactive: ['census-fill', 'census-3d'],
  // extrusions read best drawn after the flat layers they stand on
  lift: ['census-3d'],
  paint: [
    ['census-fill', 'fill-opacity', 0.88],
    ['census-line', 'line-opacity', 0.35],
    ['census-3d', 'fill-extrusion-opacity', 0.92],
  ],
  install(map) {
    map.addSource('census', { type: 'geojson', data: censusHexes() });
    const color = ['to-color', ['coalesce', ['feature-state', 'c'], '#1b2b47']];
    map.addLayer({
      id: 'census-fill',
      type: 'fill',
      source: 'census',
      layout: { visibility: 'none' },
      paint: { 'fill-color': color as never, 'fill-opacity': 0 },
    });
    map.addLayer({
      id: 'census-line',
      type: 'line',
      source: 'census',
      layout: { visibility: 'none' },
      paint: { 'line-color': '#02060d', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.3, 9, 1.2], 'line-opacity': 0 },
    });
    map.addLayer({
      id: 'census-3d',
      type: 'fill-extrusion',
      source: 'census',
      layout: { visibility: 'none' },
      paint: {
        'fill-extrusion-color': color as never,
        'fill-extrusion-height': ['*', ['^', ['coalesce', ['feature-state', 'h'], 0], 1.6], 90000],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0,
        'fill-extrusion-vertical-gradient': true,
      },
    });
    transitionTo(map, 'density', null);
  },
  applyOptions(map, opts, prev) {
    if (!prev || prev.var !== opts.var) transitionTo(map, opts.var as CensusVar, (prev?.var as CensusVar) ?? null);
    if (opts.extrude && !prev?.extrude && map.getPitch() < 25) map.easeTo({ pitch: 52, duration: 1200 });
  },
  hoverLabel: (f) => String(f.properties.place),
  identify(f) {
    const p = f.properties;
    const series = censusSeries(Number(p.seed), Number(p.density), Number(p.change));
    return {
      kicker: 'Census hex · ~46 sq mi',
      title: String(p.place),
      subtitle: `${fmtCompact(series[series.length - 1])} residents (est.)`,
      accent: '#4cc9a0',
      stats: [
        { label: 'Density', value: `${fmtInt(Number(p.density))} / sq mi` },
        { label: 'Median income', value: fmtUSD(Number(p.income)) },
        { label: 'Median age', value: `${p.age}` },
        { label: 'Change 2010–20', value: fmtPct(Number(p.change)) },
      ],
      series: { label: 'Population estimate', values: series, start: '2000', end: '2023', format: fmtCompact },
      source: census.source.name,
      mock: true,
      highlight: f.geometry,
    };
  },
};
