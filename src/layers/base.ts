import { cityPoints } from '../data/mock';
import type { LayerDef } from './types';
import { addGeoJSON, fmtInt, FONT, isLight } from './util';

export const hillshade: LayerDef = {
  id: 'hillshade',
  name: 'Terrain hillshade',
  category: 'base',
  description: 'Lidar-style relief shading that reveals the North Shore highlands, river valleys and the Driftless Area.',
  mock: false,
  source: { name: 'AWS Terrain Tiles (USGS 3DEP, SRTM)', url: 'https://registry.opendata.aws/terrain-tiles/' },
  defaultVisible: true,
  defaultOpacity: 0.7,
  legend: { kind: 'note', text: 'Relief exaggerated for a flat state — Eagle Mountain tops out at 2,301 ft.' },
  mapLayers: ['hillshade'],
  paint: [['hillshade', 'hillshade-exaggeration', 0.9]],
  install(map) {
    map.addSource('dem', {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 12,
      encoding: 'terrarium',
      attribution: 'Terrain: Mapzen, USGS 3DEP',
    });
    map.addLayer({
      id: 'hillshade',
      type: 'hillshade',
      source: 'dem',
      layout: { visibility: 'none' },
      paint: {
        'hillshade-exaggeration': 0,
        'hillshade-shadow-color': 'rgba(0,2,8,0.9)',
        'hillshade-highlight-color': 'rgba(130,175,230,0.5)',
        'hillshade-accent-color': 'rgba(0,4,12,0.5)',
        'hillshade-illumination-direction': 315,
      },
    });
  },
  onBasemap(map, basemap) {
    const light = isLight(basemap);
    const nw = basemap === 'northwoods';
    map.setPaintProperty('hillshade', 'hillshade-shadow-color', light ? 'rgba(40,52,70,0.55)' : nw ? 'rgba(0,8,4,0.9)' : 'rgba(0,2,8,0.9)');
    map.setPaintProperty('hillshade', 'hillshade-highlight-color', light ? 'rgba(255,255,255,0.8)' : nw ? 'rgba(150,220,170,0.4)' : 'rgba(130,175,230,0.5)');
    map.setPaintProperty('hillshade', 'hillshade-accent-color', light ? 'rgba(60,70,90,0.35)' : 'rgba(0,4,12,0.5)');
  },
};

export const cities: LayerDef = {
  id: 'cities',
  name: 'Cities & towns',
  category: 'base',
  description: 'Population centers, sized by population. Suburbs appear as you zoom in.',
  mock: false,
  source: { name: 'US Census Bureau — 2020 counts (rounded)', url: 'https://data.census.gov' },
  defaultVisible: true,
  defaultOpacity: 1,
  legend: {
    kind: 'swatches',
    items: [
      { color: '#e6edf7', label: 'Major city', shape: 'ring' },
      { color: '#9fb0c8', label: 'Regional center', shape: 'dot' },
    ],
  },
  mapLayers: ['cities-dot', 'cities-label'],
  interactive: ['cities-dot', 'cities-label'],
  paint: [
    ['cities-dot', 'circle-opacity', 1],
    ['cities-dot', 'circle-stroke-opacity', 1],
    ['cities-label', 'text-opacity', 1],
  ],
  install(map) {
    addGeoJSON(map, 'cities', cityPoints());
    map.addLayer({
      id: 'cities-dot',
      type: 'circle',
      source: 'cities',
      layout: { visibility: 'none', 'circle-sort-key': ['-', 4, ['get', 'tier']] },
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          5, ['match', ['get', 'tier'], 1, 3.2, 2, 2.2, 0],
          8, ['match', ['get', 'tier'], 1, 4.5, 2, 3.2, 2.2],
        ],
        'circle-color': ['match', ['get', 'tier'], 1, '#050a13', '#9fb0c8'],
        'circle-stroke-color': '#e6edf7',
        'circle-stroke-width': ['match', ['get', 'tier'], 1, 1.6, 0],
        'circle-opacity': 0,
        'circle-stroke-opacity': 0,
      },
    });
    map.addLayer({
      id: 'cities-label',
      type: 'symbol',
      source: 'cities',
      layout: {
        visibility: 'none',
        'symbol-sort-key': ['get', 'tier'],
        'text-field': ['get', 'name'],
        'text-font': ['match', ['get', 'tier'], 3, ['literal', FONT.regular], ['literal', FONT.medium]],
        'text-size': ['interpolate', ['linear'], ['zoom'], 5, ['match', ['get', 'tier'], 1, 11.5, 2, 10.5, 9.5], 9, ['match', ['get', 'tier'], 1, 15, 2, 13, 12]],
        'text-transform': ['match', ['get', 'tier'], 1, 'uppercase', 'none'],
        'text-letter-spacing': ['match', ['get', 'tier'], 1, 0.12, 0.02],
        'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
        'text-radial-offset': 0.7,
        'text-padding': 4,
      },
      paint: {
        'text-color': ['match', ['get', 'tier'], 1, '#f1f5fb', 2, '#d4deeb', '#aebbd0'],
        'text-halo-color': 'rgba(5,10,19,0.9)',
        'text-halo-width': 1.2,
        'text-halo-blur': 0.3,
        'text-opacity': 0,
      },
    });
  },
  onBasemap(map, basemap) {
    const light = isLight(basemap);
    map.setPaintProperty('cities-label', 'text-color', light ? ['match', ['get', 'tier'], 1, '#0f172a', 2, '#1f2937', '#475569'] : ['match', ['get', 'tier'], 1, '#f1f5fb', 2, '#d4deeb', '#aebbd0']);
    map.setPaintProperty('cities-label', 'text-halo-color', light ? 'rgba(255,255,255,0.95)' : 'rgba(5,10,19,0.9)');
    map.setPaintProperty('cities-dot', 'circle-color', light ? ['match', ['get', 'tier'], 1, '#ffffff', '#475569'] : ['match', ['get', 'tier'], 1, '#050a13', '#9fb0c8']);
    map.setPaintProperty('cities-dot', 'circle-stroke-color', light ? '#0f172a' : '#e6edf7');
  },
  hoverLabel: (f) => String(f.properties.name),
  identify(f) {
    const p = f.properties;
    return {
      kicker: 'City',
      title: String(p.name),
      subtitle: ['', 'Major city', 'Regional center', 'Community'][Number(p.tier)],
      accent: '#e6edf7',
      stats: [{ label: 'Population', value: fmtInt(Number(p.pop)) }],
      source: cities.source.name,
      mock: false,
      highlight: f.geometry,
    };
  },
};
