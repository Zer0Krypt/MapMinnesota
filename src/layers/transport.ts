import type { ExpressionSpecification, GeoJSONSource } from 'maplibre-gl';
import { RAMPS, rampExpression } from '../data/color';
import { highways as highwayData, trafficSeries, transit as transitData } from '../data/mock';
import { along, dashAt, throttle } from './anim';
import type { LayerDef } from './types';
import { addGeoJSON, fmtCompact, fmtInt, FONT, isLight } from './util';

export const highways: LayerDef = {
  id: 'highways',
  name: 'Highways & traffic',
  category: 'transport',
  description: 'Interstates and US highways colored by annual average daily traffic (AADT), with animated flow.',
  mock: true,
  source: { name: 'MnDOT Traffic Volumes (AADT)', url: 'https://gisdata.mn.gov/organization/us-mn-state-dot' },
  defaultVisible: true,
  defaultOpacity: 0.95,
  legend: { kind: 'gradient', ramp: RAMPS.traffic, labels: ['3k', '20k', '170k'], unit: 'vehicles / day' },
  options: [{ key: 'flow', label: 'Animate flow', type: 'toggle' }],
  defaultOptions: { flow: true },
  mapLayers: ['hwy-casing', 'hwy-line', 'hwy-flow'],
  layersFor: (o) => (o.flow ? ['hwy-casing', 'hwy-line', 'hwy-flow'] : ['hwy-casing', 'hwy-line']),
  interactive: ['hwy-line'],
  paint: [
    ['hwy-casing', 'line-opacity', 0.85],
    ['hwy-line', 'line-opacity', 1],
    ['hwy-flow', 'line-opacity', 0.75],
  ],
  install(map) {
    addGeoJSON(map, 'highways', highwayData());
    const width = (k: number): ExpressionSpecification =>
      ['interpolate', ['exponential', 1.5], ['zoom'], 5, ['match', ['get', 'cls'], 'Interstate', 1.6 * k, 0.9 * k], 10, ['match', ['get', 'cls'], 'Interstate', 5 * k, 3 * k], 14, ['match', ['get', 'cls'], 'Interstate', 12 * k, 8 * k]] as ExpressionSpecification;
    map.addLayer({
      id: 'hwy-casing',
      type: 'line',
      source: 'highways',
      layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#02060d', 'line-width': width(2.1), 'line-opacity': 0, 'line-blur': 1 },
    });
    map.addLayer({
      id: 'hwy-line',
      type: 'line',
      source: 'highways',
      layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round', 'line-sort-key': ['get', 'n'] },
      paint: { 'line-color': rampExpression(RAMPS.traffic, ['get', 'n']) as never, 'line-width': width(1), 'line-opacity': 0 },
    });
    map.addLayer({
      id: 'hwy-flow',
      type: 'line',
      source: 'highways',
      layout: { visibility: 'none', 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-width': width(0.45),
        'line-opacity': 0,
        'line-dasharray': [0.8, 5],
        'line-dasharray-transition': { duration: 0, delay: 0 },
      } as never,
    });
  },
  onBasemap(map, basemap) {
    map.setPaintProperty('hwy-casing', 'line-color', isLight(basemap) ? '#ffffff' : '#02060d');
    map.setPaintProperty('hwy-flow', 'line-color', isLight(basemap) ? '#0f172a' : '#ffffff');
  },
  animate(map, t) {
    if (!throttle('hwy', t, 24)) return;
    map.setPaintProperty('hwy-flow', 'line-dasharray', dashAt(0.8, 5, -t * 0.9));
  },
  hoverLabel: (f) => `${f.properties.name} · ${fmtCompact(Number(f.properties.aadt))} / day`,
  identify(f) {
    const p = f.properties;
    const series = trafficSeries(Number(p.seed), Number(p.aadt));
    return {
      kicker: 'Highway segment',
      title: String(p.name),
      subtitle: String(p.cls),
      accent: '#f7c548',
      stats: [
        { label: 'AADT', value: fmtInt(Number(p.aadt)) },
        { label: 'Avg speed now', value: `${p.speed} mph` },
        { label: 'Heavy commercial', value: `${(6 + (Number(p.seed) % 90) / 10).toFixed(1)}%` },
      ],
      series: { label: 'Typical weekday volume by hour', values: series, start: '12a', end: '11p', format: (v) => `${fmtInt(v)} veh/hr`, labelAt: (h) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}` },
      source: highways.source.name,
      mock: true,
      highlight: f.geometry,
    };
  },
};

export const transit: LayerDef = {
  id: 'transit',
  name: 'Light rail',
  category: 'transport',
  description: 'METRO Blue and Green lines with live-ish train positions. Zoom into the Twin Cities.',
  mock: true,
  source: { name: 'Metro Transit GTFS', url: 'https://svc.metrotransit.org/' },
  defaultVisible: true,
  defaultOpacity: 1,
  minzoom: 9,
  legend: {
    kind: 'swatches',
    items: [
      { color: '#3b82f6', label: 'Blue Line', shape: 'line' },
      { color: '#22c55e', label: 'Green Line', shape: 'line' },
      { color: '#ffffff', label: 'Train (simulated)', shape: 'dot' },
    ],
  },
  mapLayers: ['rail-line-glow', 'rail-line', 'rail-stations', 'rail-trains', 'rail-labels'],
  interactive: ['rail-stations'],
  paint: [
    ['rail-line-glow', 'line-opacity', 0.35],
    ['rail-line', 'line-opacity', 1],
    ['rail-stations', 'circle-opacity', 1],
    ['rail-stations', 'circle-stroke-opacity', 1],
    ['rail-trains', 'circle-opacity', 1],
    ['rail-labels', 'text-opacity', 1],
  ],
  install(map) {
    const { lines, stations } = transitData();
    addGeoJSON(map, 'rail-lines', lines);
    addGeoJSON(map, 'rail-stations', stations);
    addGeoJSON(map, 'rail-trains', { type: 'FeatureCollection', features: [] });
    map.addLayer({
      id: 'rail-line-glow',
      type: 'line',
      source: 'rail-lines',
      minzoom: 8.5,
      layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 6, 14, 18], 'line-blur': 6, 'line-opacity': 0 },
    });
    map.addLayer({
      id: 'rail-line',
      type: 'line',
      source: 'rail-lines',
      minzoom: 8.5,
      layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.8, 14, 5], 'line-opacity': 0 },
    });
    map.addLayer({
      id: 'rail-stations',
      type: 'circle',
      source: 'rail-stations',
      minzoom: 10,
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 14, 6],
        'circle-color': '#050a13',
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-opacity': 0,
        'circle-stroke-opacity': 0,
      },
    });
    map.addLayer({
      id: 'rail-trains',
      type: 'circle',
      source: 'rail-trains',
      minzoom: 8.5,
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3, 14, 7],
        'circle-color': '#ffffff',
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-width': 2.5,
        'circle-blur': 0.1,
        'circle-opacity': 0,
      },
    });
    map.addLayer({
      id: 'rail-labels',
      type: 'symbol',
      source: 'rail-stations',
      minzoom: 12,
      layout: {
        visibility: 'none',
        'text-field': ['get', 'name'],
        'text-font': FONT.regular,
        'text-size': 11,
        'text-anchor': 'left',
        'text-offset': [0.9, 0],
      },
      paint: { 'text-color': '#cfe0ff', 'text-halo-color': 'rgba(5,10,19,0.9)', 'text-halo-width': 1.2, 'text-opacity': 0 },
    });
  },
  onBasemap(map, basemap) {
    const light = isLight(basemap);
    map.setPaintProperty('rail-stations', 'circle-color', light ? '#ffffff' : '#050a13');
    map.setPaintProperty('rail-labels', 'text-color', light ? '#1e293b' : '#cfe0ff');
    map.setPaintProperty('rail-labels', 'text-halo-color', light ? '#ffffff' : 'rgba(5,10,19,0.9)');
  },
  animate(map, t) {
    if (map.getZoom() < 8.5 || !throttle('rail', t, 20)) return;
    const { lines } = transitData();
    const features = lines.features.flatMap((l) => {
      const coords = l.geometry.coordinates as [number, number][];
      return [0, 0.33, 0.66].map((o, i) => {
        // ping-pong along the line
        const raw = (t / 90 + o) % 2;
        const f = raw > 1 ? 2 - raw : raw;
        return {
          type: 'Feature' as const,
          properties: { color: l.properties!.color, i },
          geometry: { type: 'Point' as const, coordinates: along(coords, f) },
        };
      });
    });
    (map.getSource('rail-trains') as GeoJSONSource).setData({ type: 'FeatureCollection', features });
  },
  hoverLabel: (f) => `${f.properties.name} station`,
  identify(f) {
    const p = f.properties;
    return {
      kicker: 'Light rail station',
      title: String(p.name),
      subtitle: `${p.line} Line`,
      accent: String(p.color),
      stats: [
        { label: 'Avg weekday boardings', value: fmtInt(Number(p.boardings)) },
        { label: 'Next train', value: `${1 + (Number(p.boardings) % 9)} min` },
      ],
      source: transit.source.name,
      mock: true,
      highlight: f.geometry,
    };
  },
};
