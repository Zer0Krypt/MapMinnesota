import type { GeoJSONSource } from 'maplibre-gl';
import { crimePoints, MPCA_TYPES, mpcaSites, OWNERS, publicLands } from '../data/mock';
import { mulberry32 } from '../data/random';
import type { LayerDef } from './types';
import { addGeoJSON, fmtInt, FONT, isLight } from './util';

export const mpca: LayerDef = {
  id: 'mpca',
  name: 'Regulated sites',
  category: 'environment',
  description: "Permits, leak sites, brownfields and cleanups from MPCA's What's in My Neighborhood. Click a cluster to zoom in.",
  mock: true,
  source: { name: "MPCA What's in My Neighborhood", url: 'https://www.pca.state.mn.us/about-mpca/whats-in-my-neighborhood' },
  defaultVisible: false,
  defaultOpacity: 1,
  above: true,
  options: [
    { key: 'type', label: 'Site type', type: 'select', choices: [{ value: 'all', label: 'All site types' }, ...MPCA_TYPES.map((t) => ({ value: t.key, label: t.key }))] },
  ],
  defaultOptions: { type: 'all' },
  legend: { kind: 'swatches', items: MPCA_TYPES.map((t) => ({ color: t.color, label: t.key, shape: 'dot' as const })) },
  mapLayers: ['mpca-halo', 'mpca-cluster', 'mpca-count', 'mpca-point'],
  interactive: ['mpca-cluster', 'mpca-point'],
  paint: [
    ['mpca-halo', 'circle-opacity', 0.18],
    ['mpca-cluster', 'circle-opacity', 0.92],
    ['mpca-cluster', 'circle-stroke-opacity', 1],
    ['mpca-count', 'text-opacity', 1],
    ['mpca-point', 'circle-opacity', 1],
    ['mpca-point', 'circle-stroke-opacity', 1],
  ],
  install(map) {
    addGeoJSON(map, 'mpca', mpcaSites(), { cluster: true, clusterRadius: 44, clusterMaxZoom: 11 });
    const radius = ['step', ['get', 'point_count'], 11, 10, 14, 40, 19, 120, 25];
    map.addLayer({
      id: 'mpca-halo',
      type: 'circle',
      source: 'mpca',
      filter: ['has', 'point_count'],
      layout: { visibility: 'none' },
      paint: { 'circle-radius': ['*', radius, 1.7] as never, 'circle-color': '#f59e0b', 'circle-blur': 0.8, 'circle-opacity': 0 },
    });
    map.addLayer({
      id: 'mpca-cluster',
      type: 'circle',
      source: 'mpca',
      filter: ['has', 'point_count'],
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': radius as never,
        'circle-color': ['step', ['get', 'point_count'], '#2b1f0a', 40, '#3a2508', 120, '#4a2a06'],
        'circle-stroke-color': '#f59e0b',
        'circle-stroke-width': 1.5,
        'circle-opacity': 0,
        'circle-stroke-opacity': 0,
      },
    });
    map.addLayer({
      id: 'mpca-count',
      type: 'symbol',
      source: 'mpca',
      filter: ['has', 'point_count'],
      layout: {
        visibility: 'none',
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': FONT.medium,
        'text-size': 11.5,
        'text-allow-overlap': true,
      },
      paint: { 'text-color': '#fde68a', 'text-opacity': 0 },
    });
    map.addLayer({
      id: 'mpca-point',
      type: 'circle',
      source: 'mpca',
      filter: ['!', ['has', 'point_count']],
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3.5, 13, 7],
        'circle-color': ['get', 'color'],
        'circle-stroke-color': '#050a13',
        'circle-stroke-width': 1.2,
        'circle-opacity': 0,
        'circle-stroke-opacity': 0,
      },
    });
  },
  applyOptions(map, opts, prev) {
    if (prev && prev.type === opts.type) return;
    const all = mpcaSites();
    const data = opts.type === 'all' ? all : { ...all, features: all.features.filter((f) => f.properties!.type === opts.type) };
    (map.getSource('mpca') as GeoJSONSource).setData(data);
  },
  onBasemap(map, basemap) {
    const light = isLight(basemap);
    map.setPaintProperty('mpca-cluster', 'circle-color', light ? '#fff7e6' : ['step', ['get', 'point_count'], '#2b1f0a', 40, '#3a2508', 120, '#4a2a06']);
    map.setPaintProperty('mpca-count', 'text-color', light ? '#92400e' : '#fde68a');
    map.setPaintProperty('mpca-point', 'circle-stroke-color', light ? '#ffffff' : '#050a13');
  },
  hoverLabel: (f) => (f.properties.point_count ? `${f.properties.point_count} sites — click to expand` : `${f.properties.type} · ${f.properties.id}`),
  identify(f, map) {
    const p = f.properties;
    if (p.cluster) {
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      (map.getSource('mpca') as GeoJSONSource).getClusterExpansionZoom(Number(p.cluster_id)).then((zoom) => map.easeTo({ center: coords, zoom: zoom + 0.3, duration: 700 }));
      return null;
    }
    return {
      kicker: 'MPCA regulated site',
      title: `${p.type} — ${p.near}`,
      subtitle: String(p.id),
      accent: String(p.color),
      stats: [
        { label: 'Status', value: String(p.status) },
        { label: 'On record since', value: String(p.since) },
        { label: 'Program', value: { 'Leak site': 'Petroleum Remediation', Brownfield: 'Voluntary Investigation & Cleanup', 'Air permit': 'Air Quality', 'Water permit': 'Water Quality', 'Hazardous waste': 'Hazardous Waste', 'Solid waste': 'Solid Waste' }[String(p.type)] ?? '—' },
      ],
      source: mpca.source.name,
      mock: true,
      highlight: f.geometry,
    };
  },
};

export const crime: LayerDef = {
  id: 'crime',
  name: 'Crime rate',
  category: 'safety',
  description: 'Reported Part I offenses per 1,000 residents — normalized by population, not raw counts.',
  mock: true,
  source: { name: 'MN BCA Crime Data Explorer', url: 'https://cde.state.mn.us/' },
  defaultVisible: false,
  defaultOpacity: 0.9,
  above: true,
  legend: {
    kind: 'gradient',
    ramp: ['#3b4a6b', '#7c6bb0', '#c06aa6', '#f0727a', '#ffb37a'],
    labels: ['4', '20', '40+'],
    unit: 'offenses per 1,000 residents · 2024',
  },
  mapLayers: ['crime-dots'],
  interactive: ['crime-dots'],
  paint: [
    ['crime-dots', 'circle-opacity', 0.85],
    ['crime-dots', 'circle-stroke-opacity', 0.6],
  ],
  install(map) {
    addGeoJSON(map, 'crime', crimePoints());
    map.addLayer({
      id: 'crime-dots',
      type: 'circle',
      source: 'crime',
      layout: { visibility: 'none', 'circle-sort-key': ['get', 'n'] },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, ['+', 1, ['*', ['get', 'n'], 4.5]], 9, ['+', 3, ['*', ['get', 'n'], 16]]],
        'circle-color': ['interpolate', ['linear'], ['get', 'n'], 0, '#3b4a6b', 0.25, '#7c6bb0', 0.5, '#c06aa6', 0.75, '#f0727a', 1, '#ffb37a'],
        'circle-stroke-color': '#050a13',
        'circle-stroke-width': 0.6,
        'circle-opacity': 0,
        'circle-stroke-opacity': 0,
      },
    });
  },
  hoverLabel: (f) => `${f.properties.place}: ${f.properties.rate} per 1k`,
  identify(f) {
    const p = f.properties;
    const rng = mulberry32(Number(p.seed));
    let v = Number(p.rate) * (1 - Number(p.trend) / 100) ** 5;
    const values = Array.from({ length: 6 }, () => (v *= 1 + (rng() - 0.5) * 0.1));
    values[values.length - 1] = Number(p.rate);
    return {
      kicker: 'Public safety · hex area',
      title: String(p.place),
      subtitle: `${p.rate} offenses per 1,000 residents`,
      accent: '#f0727a',
      stats: [
        { label: 'Violent share', value: `${p.violent}%` },
        { label: 'Year-over-year', value: `${Number(p.trend) > 0 ? '+' : ''}${p.trend}%` },
        { label: 'Population base', value: fmtInt(Number(p.pop)) },
      ],
      series: { label: 'Rate per 1,000, 2019–2024', values, start: '2019', end: '2024', format: (x) => x.toFixed(1) },
      source: crime.source.name,
      mock: true,
      highlight: f.geometry,
    };
  },
};

export const lands: LayerDef = {
  id: 'lands',
  name: 'Public land ownership',
  category: 'land',
  description: 'Federal, state, county, tribal and wildlife-management lands. Parcel detail depends on county opt-in.',
  mock: true,
  source: { name: 'MnGeo Public Land / Statewide Parcels (opt-in)', url: 'https://gisdata.mn.gov/dataset/plan-parcels-open' },
  defaultVisible: false,
  defaultOpacity: 0.6,
  legend: { kind: 'swatches', items: OWNERS.map((o) => ({ color: o.color, label: o.key, shape: 'square' as const })) },
  mapLayers: ['lands-fill', 'lands-line', 'lands-label'],
  interactive: ['lands-fill'],
  paint: [
    ['lands-fill', 'fill-opacity', 0.55],
    ['lands-line', 'line-opacity', 0.9],
    ['lands-label', 'text-opacity', 1],
  ],
  install(map) {
    addGeoJSON(map, 'lands', publicLands());
    map.addLayer({
      id: 'lands-fill',
      type: 'fill',
      source: 'lands',
      layout: { visibility: 'none' },
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0 },
    });
    map.addLayer({
      id: 'lands-line',
      type: 'line',
      source: 'lands',
      layout: { visibility: 'none' },
      paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 10, 2], 'line-opacity': 0 },
    });
    map.addLayer({
      id: 'lands-label',
      type: 'symbol',
      source: 'lands',
      minzoom: 6.3,
      filter: ['!', ['in', '#', ['get', 'name']]],
      layout: {
        visibility: 'none',
        'text-field': ['get', 'name'],
        'text-font': FONT.medium,
        'text-size': 10.5,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.1,
        'text-max-width': 9,
      },
      paint: { 'text-color': ['get', 'color'], 'text-halo-color': 'rgba(5,10,19,0.85)', 'text-halo-width': 1.2, 'text-opacity': 0 },
    });
  },
  onBasemap(map, basemap) {
    map.setPaintProperty('lands-label', 'text-halo-color', isLight(basemap) ? 'rgba(255,255,255,0.9)' : 'rgba(5,10,19,0.85)');
  },
  hoverLabel: (f) => `${f.properties.name} · ${f.properties.owner}`,
  identify(f) {
    const p = f.properties;
    return {
      kicker: 'Public land',
      title: String(p.name),
      subtitle: String(p.owner),
      accent: String(p.color),
      stats: [
        { label: 'Approx. area', value: `${fmtInt(Number(p.acres))} acres` },
        { label: 'Sample parcel', value: String(p.parcel) },
        { label: 'Public access', value: p.owner === 'Tribal' ? 'Tribal permission required' : 'Open (seasonal rules)' },
      ],
      source: lands.source.name,
      mock: true,
      highlight: f.geometry,
    };
  },
};
