import type { GeoJSONSource } from 'maplibre-gl';
import { RAMPS } from '../data/color';
import { auroraFrame, nearestCity, radarFrame, temperatureAt, temperatureReadings } from '../data/mock';
import { mulberry32 } from '../data/random';
import { renderField } from '../data/raster';
import { throttle } from './anim';
import type { LayerDef } from './types';
import { addGeoJSON, FONT, isLight } from './util';

const TEMP_MIN = 30;
const TEMP_MAX = 70;
const tNorm = (t: number) => (t - TEMP_MIN) / (TEMP_MAX - TEMP_MIN);

export const radar: LayerDef = {
  id: 'radar',
  name: 'Precipitation radar',
  category: 'weather',
  description: 'Looping reflectivity as a squall line sweeps east across the state.',
  mock: true,
  source: { name: 'NWS / NOAA MRMS radar mosaic', url: 'https://www.weather.gov/' },
  defaultVisible: true,
  defaultOpacity: 0.75,
  legend: { kind: 'gradient', ramp: RAMPS.radar.slice(1), labels: ['Light', 'Moderate', 'Heavy'], unit: 'dBZ (simulated loop)' },
  mapLayers: ['radar'],
  paint: [['radar', 'heatmap-opacity', 0.85]],
  install(map) {
    addGeoJSON(map, 'radar', radarFrame(0));
    map.addLayer({
      id: 'radar',
      type: 'heatmap',
      source: 'radar',
      layout: { visibility: 'none' },
      paint: {
        'heatmap-weight': ['get', 'w'],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 0.45, 7, 0.75, 10, 1.4],
        'heatmap-radius': ['interpolate', ['exponential', 2], ['zoom'], 4, 7, 7, 24, 10, 140],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.12, 'rgba(31,191,143,0.35)',
          0.3, '#58d65b',
          0.5, '#d9e84a',
          0.68, '#f7b733',
          0.84, '#f0613a',
          1, '#c42d6e',
        ],
        'heatmap-opacity': 0,
      },
    });
  },
  animate(map, t) {
    if (!throttle('radar', t, 12)) return;
    (map.getSource('radar') as GeoJSONSource).setData(radarFrame(t * 0.045));
  },
};

export const temperature: LayerDef = {
  id: 'temperature',
  name: 'Air temperature',
  category: 'weather',
  description: 'Current conditions interpolated between stations. Note the Lake Superior chill along the North Shore.',
  mock: true,
  source: { name: 'Open-Meteo / NWS observations', url: 'https://open-meteo.com/' },
  defaultVisible: false,
  defaultOpacity: 0.75,
  legend: { kind: 'gradient', ramp: RAMPS.temperature, labels: [`${TEMP_MIN}°`, '50°', `${TEMP_MAX}°F`] },
  mapLayers: ['temp-raster', 'temp-labels'],
  interactive: ['temp-labels'],
  paint: [
    ['temp-raster', 'raster-opacity', 0.85],
    ['temp-labels', 'text-opacity', 1],
  ],
  install(map) {
    const r = renderField((p) => tNorm(temperatureAt(p)), RAMPS.temperature, { width: 520 });
    map.addSource('temp-raster', { type: 'image', url: r.url, coordinates: r.coordinates });
    map.addLayer({
      id: 'temp-raster',
      type: 'raster',
      source: 'temp-raster',
      layout: { visibility: 'none' },
      paint: { 'raster-opacity': 0, 'raster-resampling': 'linear', 'raster-fade-duration': 0 },
    });
    addGeoJSON(map, 'temp-readings', temperatureReadings());
    map.addLayer({
      id: 'temp-labels',
      type: 'symbol',
      source: 'temp-readings',
      layout: {
        visibility: 'none',
        'symbol-sort-key': ['get', 'tier'],
        'text-field': ['get', 'label'],
        'text-font': FONT.medium,
        'text-size': ['interpolate', ['linear'], ['zoom'], 5, 12, 9, 17],
        'text-offset': [0, -1.3],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(10,16,32,0.85)', 'text-halo-width': 1.6, 'text-opacity': 0 },
    });
  },
  onBasemap(map, basemap) {
    map.setPaintProperty('temp-labels', 'text-color', isLight(basemap) ? '#0f172a' : '#ffffff');
    map.setPaintProperty('temp-labels', 'text-halo-color', isLight(basemap) ? 'rgba(255,255,255,0.9)' : 'rgba(10,16,32,0.85)');
  },
  hoverLabel: (f) => `${f.properties.name}: ${f.properties.temp}°F`,
  identify(f) {
    const p = f.properties;
    const rng = mulberry32(String(p.name).length * 997);
    const now = Number(p.temp);
    const values = Array.from({ length: 24 }, (_, h) => now - 9 + 9 * Math.sin(((h - 9) / 24) * Math.PI * 2) * 0.5 + 4.5 + (rng() - 0.5) * 1.5);
    return {
      kicker: 'Weather station',
      title: String(p.name),
      subtitle: `${now}°F · ${['Partly cloudy', 'Clear', 'Breezy', 'Overcast'][Math.floor(rng() * 4)]}`,
      accent: '#f6b26b',
      stats: [
        { label: 'Feels like', value: `${now - Math.floor(rng() * 5)}°F` },
        { label: 'Wind', value: `${['NW', 'W', 'SW', 'S'][Math.floor(rng() * 4)]} ${5 + Math.floor(rng() * 15)} mph` },
        { label: 'Humidity', value: `${40 + Math.floor(rng() * 45)}%` },
      ],
      series: { label: 'Last 24 hours', values, start: '24h ago', end: 'now', format: (v) => `${Math.round(v)}°F`, labelAt: (i) => (i === 23 ? 'now' : `${23 - i}h ago`) },
      source: temperature.source.name,
      mock: true,
      highlight: f.geometry,
    };
  },
  sample: ({ lng, lat }) => ({ label: 'Air temperature', value: `${Math.round(temperatureAt([lng, lat]))}°F` }),
};

export const aurora: LayerDef = {
  id: 'aurora',
  name: 'Aurora outlook',
  category: 'weather',
  description: "Tonight's northern lights oval. Best viewing: dark skies north of US-2.",
  mock: true,
  source: { name: 'NOAA SWPC OVATION aurora model', url: 'https://www.swpc.noaa.gov/products/aurora-30-minute-forecast' },
  defaultVisible: false,
  defaultOpacity: 0.85,
  above: true,
  legend: {
    kind: 'gradient',
    ramp: ['#14532d', '#22c55e', '#5eead4', '#a78bfa', '#f0abfc'],
    labels: ['Possible', 'Likely', 'Overhead'],
    unit: 'Kp 6 storm (simulated)',
  },
  mapLayers: ['aurora'],
  paint: [['aurora', 'heatmap-opacity', 0.9]],
  install(map) {
    addGeoJSON(map, 'aurora', auroraFrame(0));
    map.addLayer({
      id: 'aurora',
      type: 'heatmap',
      source: 'aurora',
      layout: { visibility: 'none' },
      paint: {
        'heatmap-weight': ['get', 'w'],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 0.75, 7, 0.8, 9, 0.95],
        'heatmap-radius': ['interpolate', ['exponential', 2], ['zoom'], 4, 9, 7, 30, 9, 90],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.08, 'rgba(16,185,129,0.12)',
          0.3, 'rgba(34,197,94,0.45)',
          0.55, 'rgba(74,222,128,0.7)',
          0.75, 'rgba(94,234,212,0.82)',
          0.9, 'rgba(196,181,253,0.88)',
          1, 'rgba(240,171,252,0.95)',
        ],
        'heatmap-opacity': 0,
      },
    });
  },
  animate(map, t) {
    if (!throttle('aurora', t, 15)) return;
    (map.getSource('aurora') as GeoJSONSource).setData(auroraFrame(t));
  },
  sample: ({ lng, lat }) => (lat > 46.8 ? { label: 'Aurora chance', value: `${Math.min(95, Math.round((lat - 46.8) * 38))}% near ${nearestCity([lng, lat]).city.name}` } : null),
};
