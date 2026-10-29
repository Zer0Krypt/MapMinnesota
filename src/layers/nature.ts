import type { ExpressionSpecification } from 'maplibre-gl';
import { RAMPS } from '../data/color';
import { forestAt, lakes, parks as parkData, rivers } from '../data/mock';
import { mulberry32 } from '../data/random';
import { renderField } from '../data/raster';
import { dashAt, throttle } from './anim';
import type { LayerDef } from './types';
import { addGeoJSON, fmtCompact, fmtInt, FONT, isLight } from './util';

export const water: LayerDef = {
  id: 'water',
  name: 'Lakes & rivers',
  category: 'nature',
  description: 'Public waters shaded by depth, with flowing rivers. 10,000 lakes (well, ~530 of them in this mock).',
  mock: true,
  source: { name: 'MN DNR Hydrography Dataset', url: 'https://gisdata.mn.gov/dataset/water-dnr-hydrography' },
  defaultVisible: true,
  defaultOpacity: 1,
  legend: {
    kind: 'gradient',
    ramp: ['#3fb6ee', '#1f7fc0', '#0d4f8a'],
    labels: ['Shallow', 'Deep'],
    unit: 'max depth',
  },
  options: [{ key: 'flow', label: 'Animate river flow', type: 'toggle' }],
  defaultOptions: { flow: true },
  mapLayers: ['lakes-fill', 'lakes-outline', 'rivers-glow', 'rivers', 'rivers-flow', 'water-labels', 'river-labels'],
  layersFor: (o) => ['lakes-fill', 'lakes-outline', 'rivers-glow', 'rivers', ...(o.flow ? ['rivers-flow'] : []), 'water-labels', 'river-labels'],
  interactive: ['lakes-fill', 'rivers'],
  paint: [
    ['lakes-fill', 'fill-opacity', 0.92],
    ['lakes-outline', 'line-opacity', 0.55],
    ['rivers-glow', 'line-opacity', 0.35],
    ['rivers', 'line-opacity', 0.95],
    ['rivers-flow', 'line-opacity', 0.7],
    ['water-labels', 'text-opacity', 1],
    ['river-labels', 'text-opacity', 1],
  ],
  install(map) {
    addGeoJSON(map, 'lakes', lakes());
    addGeoJSON(map, 'rivers', rivers(), { lineMetrics: true });
    map.addLayer({
      id: 'lakes-fill',
      type: 'fill',
      source: 'lakes',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': ['interpolate', ['linear'], ['get', 'depth'], 12, '#3fb6ee', 45, '#1f7fc0', 110, '#0d4f8a'],
        'fill-opacity': 0,
      },
    });
    map.addLayer({
      id: 'lakes-outline',
      type: 'line',
      source: 'lakes',
      layout: { visibility: 'none' },
      paint: { 'line-color': '#9be3ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.3, 10, 1.2], 'line-opacity': 0 },
    });
    const riverWidth = (k: number): ExpressionSpecification =>
      ['interpolate', ['exponential', 1.6], ['zoom'], 5, ['match', ['get', 'order'], 1, 1.6 * k, 0.8 * k], 10, ['match', ['get', 'order'], 1, 5 * k, 2.5 * k], 14, ['match', ['get', 'order'], 1, 14 * k, 7 * k]] as ExpressionSpecification;
    map.addLayer({
      id: 'rivers-glow',
      type: 'line',
      source: 'rivers',
      layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#38bdf8', 'line-width': riverWidth(4), 'line-blur': 6, 'line-opacity': 0 },
    });
    map.addLayer({
      id: 'rivers',
      type: 'line',
      source: 'rivers',
      layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#4fb8ec', 'line-width': riverWidth(1), 'line-opacity': 0 },
    });
    map.addLayer({
      id: 'rivers-flow',
      type: 'line',
      source: 'rivers',
      layout: { visibility: 'none', 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': '#d7f3ff',
        'line-width': riverWidth(0.5),
        'line-dasharray': [1, 6],
        'line-opacity': 0,
        'line-dasharray-transition': { duration: 0, delay: 0 },
      } as never,
    });
    map.addLayer({
      id: 'water-labels',
      type: 'symbol',
      source: 'lakes',
      filter: ['any', ['==', ['get', 'major'], 1], ['>', ['get', 'acres'], 2500]],
      minzoom: 6.2,
      layout: {
        visibility: 'none',
        'text-field': ['get', 'name'],
        'text-font': FONT.italic,
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 10, 10, 14],
        'text-letter-spacing': 0.04,
        'text-max-width': 6,
      },
      paint: { 'text-color': '#a5e4ff', 'text-halo-color': 'rgba(4,22,40,0.85)', 'text-halo-width': 1.2, 'text-opacity': 0 },
    });
    map.addLayer({
      id: 'river-labels',
      type: 'symbol',
      source: 'rivers',
      minzoom: 6.5,
      layout: {
        visibility: 'none',
        'symbol-placement': 'line',
        'text-field': ['get', 'name'],
        'text-font': FONT.italic,
        'text-size': ['interpolate', ['linear'], ['zoom'], 6.5, 10, 11, 13],
        'text-letter-spacing': 0.08,
        'symbol-spacing': 320,
      },
      paint: { 'text-color': '#8fd6f7', 'text-halo-color': 'rgba(4,22,40,0.85)', 'text-halo-width': 1.2, 'text-opacity': 0 },
    });
  },
  onBasemap(map, basemap) {
    const light = isLight(basemap);
    map.setPaintProperty('lakes-outline', 'line-color', light ? '#1d6fa5' : '#9be3ff');
    for (const id of ['water-labels', 'river-labels']) {
      map.setPaintProperty(id, 'text-color', light ? '#1b5e8c' : id === 'water-labels' ? '#a5e4ff' : '#8fd6f7');
      map.setPaintProperty(id, 'text-halo-color', light ? 'rgba(255,255,255,0.9)' : 'rgba(4,22,40,0.85)');
    }
  },
  animate(map, t) {
    if (!throttle('rivers', t, 20)) return;
    map.setPaintProperty('rivers-flow', 'line-dasharray', dashAt(1, 6, -t * 0.35));
  },
  hoverLabel: (f) => String(f.properties.name),
  identify(f) {
    const p = f.properties;
    if (f.layer.id === 'rivers') {
      const rng = mulberry32(String(p.name).length * 131);
      let v = Number(p.flow);
      const values = Array.from({ length: 30 }, () => (v = Math.max(50, v * (1 + (rng() - 0.48) * 0.12))));
      return {
        kicker: 'River',
        title: String(p.name),
        subtitle: Number(p.order) === 1 ? 'Major river' : 'Tributary',
        accent: '#4fb8ec',
        stats: [
          { label: 'Discharge', value: `${fmtInt(Number(p.flow))} cfs` },
          { label: 'Stage', value: `${(4 + (Number(p.flow) % 70) / 10).toFixed(1)} ft` },
        ],
        series: { label: 'Discharge, last 30 days', values, start: '30d ago', end: 'today', format: (x) => `${fmtInt(x)} cfs`, labelAt: (i) => (i === 29 ? 'today' : `${29 - i}d ago`) },
        source: 'USGS Water Data / MN DNR',
        mock: true,
        highlight: f.geometry,
      };
    }
    const clarity = Number(p.clarity);
    return {
      kicker: 'Lake',
      title: String(p.name),
      subtitle: `${fmtInt(Number(p.acres))} acres`,
      accent: '#3fb6ee',
      stats: [
        { label: 'Max depth', value: `${p.depth} ft` },
        { label: 'Water clarity', value: `${clarity} ft` },
        { label: 'Public access', value: Number(p.seed) % 3 ? 'Yes' : 'Carry-in only' },
      ],
      bar: { label: 'Clarity (Secchi depth)', value: Math.min(1, clarity / 22), color: '#3fb6ee', caption: clarity > 12 ? 'Very clear' : clarity > 6 ? 'Moderate' : 'Turbid' },
      chips: String(p.fish).split(', '),
      source: water.source.name,
      mock: true,
      highlight: f.geometry,
    };
  },
};

export const parks: LayerDef = {
  id: 'parks',
  name: 'State parks',
  category: 'nature',
  description: 'Minnesota state parks and recreation areas, sized by annual visitors.',
  mock: true,
  source: { name: 'MN DNR State Parks', url: 'https://www.dnr.state.mn.us/state_parks/index.html' },
  defaultVisible: true,
  defaultOpacity: 1,
  above: true,
  legend: {
    kind: 'swatches',
    items: [
      { color: '#4ade80', label: 'State park', shape: 'dot' },
      { color: '#facc15', label: 'Recreation area / monument', shape: 'dot' },
    ],
  },
  mapLayers: ['parks-glow', 'parks-dot', 'parks-label'],
  interactive: ['parks-dot'],
  paint: [
    ['parks-glow', 'circle-opacity', 0.28],
    ['parks-dot', 'circle-opacity', 1],
    ['parks-dot', 'circle-stroke-opacity', 1],
    ['parks-label', 'text-opacity', 1],
  ],
  install(map) {
    addGeoJSON(map, 'parks', parkData());
    const color = ['match', ['get', 'kind'], 'State Park', '#4ade80', '#facc15'];
    const size = (k: number) => ['interpolate', ['linear'], ['zoom'], 5, ['+', 2.5 * k, ['*', ['get', 'v'], 3 * k]], 10, ['+', 5 * k, ['*', ['get', 'v'], 6 * k]]];
    map.addLayer({
      id: 'parks-glow',
      type: 'circle',
      source: 'parks',
      layout: { visibility: 'none' },
      paint: { 'circle-radius': size(2.6) as never, 'circle-color': color as never, 'circle-blur': 1, 'circle-opacity': 0 },
    });
    map.addLayer({
      id: 'parks-dot',
      type: 'circle',
      source: 'parks',
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': size(1) as never,
        'circle-color': color as never,
        'circle-stroke-color': '#052e16',
        'circle-stroke-width': 1.2,
        'circle-opacity': 0,
        'circle-stroke-opacity': 0,
      },
    });
    map.addLayer({
      id: 'parks-label',
      type: 'symbol',
      source: 'parks',
      minzoom: 7,
      layout: {
        visibility: 'none',
        'text-field': ['get', 'name'],
        'text-font': FONT.regular,
        'text-size': 11,
        'text-anchor': 'top',
        'text-offset': [0, 0.9],
        'text-max-width': 8,
        'text-optional': true,
      },
      paint: { 'text-color': '#bbf7d0', 'text-halo-color': 'rgba(2,20,10,0.85)', 'text-halo-width': 1.2, 'text-opacity': 0 },
    });
  },
  onBasemap(map, basemap) {
    const light = isLight(basemap);
    map.setPaintProperty('parks-label', 'text-color', light ? '#166534' : '#bbf7d0');
    map.setPaintProperty('parks-label', 'text-halo-color', light ? 'rgba(255,255,255,0.9)' : 'rgba(2,20,10,0.85)');
    map.setPaintProperty('parks-dot', 'circle-stroke-color', light ? '#ffffff' : '#052e16');
  },
  hoverLabel: (f) => `${f.properties.name} ${f.properties.kind}`,
  identify(f) {
    const p = f.properties;
    const rng = mulberry32(Number(p.seed));
    let v = Number(p.visitors) * 0.78;
    const values = Array.from({ length: 10 }, () => (v *= 1 + (rng() - 0.4) * 0.12));
    return {
      kicker: String(p.kind),
      title: String(p.name),
      subtitle: `Established ${p.est}`,
      accent: '#4ade80',
      stats: [
        { label: 'Acres', value: fmtInt(Number(p.acres)) },
        { label: 'Annual visitors', value: fmtCompact(Number(p.visitors)) },
      ],
      series: { label: 'Visitors, last 10 years', values, start: '2016', end: '2025', format: fmtCompact },
      chips: String(p.amenities).split(', '),
      source: parks.source.name,
      mock: true,
      highlight: f.geometry,
    };
  },
};

export const forest: LayerDef = {
  id: 'forest',
  name: 'Forest canopy',
  category: 'nature',
  description: 'Tree canopy cover — the boreal north and Driftless hardwoods versus the prairie and farm country.',
  mock: true,
  source: { name: 'MN DNR Forest Inventory / NLCD Tree Canopy', url: 'https://gisdata.mn.gov/' },
  defaultVisible: false,
  defaultOpacity: 0.8,
  legend: { kind: 'gradient', ramp: RAMPS.forest, labels: ['0%', '50%', '100%'], unit: 'canopy cover' },
  mapLayers: ['forest'],
  paint: [['forest', 'raster-opacity', 0.9]],
  install(map) {
    const r = renderField(forestAt, RAMPS.forest, { width: 560, fadeLow: true });
    map.addSource('forest', { type: 'image', url: r.url, coordinates: r.coordinates });
    map.addLayer({
      id: 'forest',
      type: 'raster',
      source: 'forest',
      layout: { visibility: 'none' },
      paint: { 'raster-opacity': 0, 'raster-resampling': 'linear', 'raster-fade-duration': 0 },
    });
  },
  sample: ({ lng, lat }) => ({ label: 'Forest canopy', value: `${Math.round(forestAt([lng, lat]) * 100)}%` }),
};
