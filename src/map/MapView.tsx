import maplibregl, { type GeoJSONSource, type MapGeoJSONFeature } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { distanceKm, inMinnesota, type LngLat } from '../data/geo';
import { nearestCity } from '../data/mock';
import { LAYER_BY_ID, LAYERS } from '../layers';
import type { Card, LayerDef } from '../layers/types';
import { DEFAULT_VIEW, type LayerState, START_FROM_HASH, useStore } from '../store';
import { applyBasemap, baseStyle, BEFORE_MASK, BEFORE_TOP } from './basemaps';
import { useMapReady } from './mapInstance';

const FADE_MS = 450;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function relativePlace(p: LngLat) {
  const { city, km } = nearestCity(p);
  if (km < 4) return `In ${city.name}`;
  const ang = Math.atan2(p[1] - city.coord[1], (p[0] - city.coord[0]) * 0.69);
  const dir = COMPASS[(Math.round((90 - (ang * 180) / Math.PI) / 45) + 8) % 8];
  return `${Math.round(km * 0.621)} mi ${dir} of ${city.name}`;
}

export default function MapView() {
  const container = useRef<HTMLDivElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const store = useStore.getState();
    const startView = START_FROM_HASH ? store.view : { ...DEFAULT_VIEW, zoom: 4.4, pitch: 0 };
    const map = new maplibregl.Map({
      container: container.current!,
      style: baseStyle(store.basemap),
      center: startView.center,
      zoom: startView.zoom,
      bearing: startView.bearing,
      pitch: startView.pitch,
      maxPitch: 70,
      minZoom: 3.5,
      maxZoom: 16,
      attributionControl: false,
      dragRotate: true,
      fadeDuration: 200,
    });
    map.addControl(new maplibregl.ScaleControl({ unit: 'imperial', maxWidth: 110 }), 'bottom-left');
    map.touchZoomRotate.enableRotation();

    const installed = new Set<string>();
    const applied = new Map<string, LayerState>();
    const pendingHide = new Map<string, number>();
    const layerToDef = new Map<string, LayerDef>();
    for (const d of LAYERS) for (const id of d.mapLayers) layerToDef.set(id, d);

    // --- layer lifecycle -----------------------------------------------------

    function ensureInstalled(def: LayerDef, state: LayerState) {
      if (installed.has(def.id)) return;
      def.install(map);
      // insert under the next installed layer from the same group to keep draw order
      const idx = LAYERS.indexOf(def);
      let before = def.above ? BEFORE_TOP : BEFORE_MASK;
      for (let i = idx + 1; i < LAYERS.length; i++) {
        const d = LAYERS[i];
        if (installed.has(d.id) && !!d.above === !!def.above) {
          before = d.mapLayers[0];
          break;
        }
      }
      for (const id of def.mapLayers) map.moveLayer(id, before);
      installed.add(def.id);
      for (const d of LAYERS) if (installed.has(d.id)) for (const id of d.lift ?? []) map.moveLayer(id, d.above ? BEFORE_TOP : BEFORE_MASK);
      def.onBasemap?.(map, useStore.getState().basemap);
      def.applyOptions?.(map, state.options, undefined);
    }

    function setLayerOpacity(def: LayerDef, layerId: string, k: number) {
      for (const [lid, prop, base] of def.paint) if (lid === layerId) map.setPaintProperty(lid, prop, base * k);
    }

    function sync(def: LayerDef, state: LayerState) {
      const prev = applied.get(def.id);
      if (!state.visible && !installed.has(def.id)) return;
      ensureInstalled(def, state);
      if (prev && prev.options !== state.options) def.applyOptions?.(map, state.options, prev.options);
      applied.set(def.id, state);

      const shown = new Set(state.visible ? (def.layersFor?.(state.options) ?? def.mapLayers) : []);
      for (const id of def.mapLayers) {
        const on = shown.has(id);
        const isVisible = map.getLayoutProperty(id, 'visibility') !== 'none';
        const pending = pendingHide.get(id);
        if (on) {
          if (pending) {
            clearTimeout(pending);
            pendingHide.delete(id);
          }
          if (!isVisible) {
            map.setLayoutProperty(id, 'visibility', 'visible');
            requestAnimationFrame(() => setLayerOpacity(def, id, state.opacity));
          } else setLayerOpacity(def, id, state.opacity);
        } else if (isVisible && !pending) {
          setLayerOpacity(def, id, 0);
          pendingHide.set(
            id,
            window.setTimeout(() => {
              pendingHide.delete(id);
              map.setLayoutProperty(id, 'visibility', 'none');
            }, FADE_MS),
          );
        }
      }
    }

    const syncAll = () => {
      const { layers } = useStore.getState();
      for (const def of LAYERS) if (applied.get(def.id) !== layers[def.id]) sync(def, layers[def.id]);
    };

    // --- highlight of the selected feature ---------------------------------

    function installHighlight() {
      map.addSource('mm-highlight', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'hl-fill', type: 'fill', source: 'mm-highlight', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.12 } });
      map.addLayer({ id: 'hl-glow', type: 'line', source: 'mm-highlight', filter: ['!=', ['geometry-type'], 'Point'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 10, 'line-blur': 8, 'line-opacity': 0.5 } });
      map.addLayer({ id: 'hl-line', type: 'line', source: 'mm-highlight', filter: ['!=', ['geometry-type'], 'Point'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 2 } });
      map.addLayer({ id: 'hl-ring', type: 'circle', source: 'mm-highlight', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 14, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2, 'circle-stroke-opacity': 0.8 } });
      map.addLayer({ id: 'hl-dot', type: 'circle', source: 'mm-highlight', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 4, 'circle-color': '#ffffff' } });
    }

    function setHighlight(card: Card | null) {
      const src = map.getSource('mm-highlight') as GeoJSONSource | undefined;
      if (!src) return;
      src.setData({ type: 'FeatureCollection', features: card?.highlight ? [{ type: 'Feature', properties: {}, geometry: card.highlight }] : [] });
      if (card?.accent) for (const [id, prop] of [['hl-glow', 'line-color'], ['hl-ring', 'circle-stroke-color']]) map.setPaintProperty(id, prop, card.accent);
    }

    // --- interaction ----------------------------------------------------------

    function interactiveLayers() {
      const { layers } = useStore.getState();
      return LAYERS.filter((d) => installed.has(d.id) && layers[d.id].visible && d.interactive)
        .flatMap((d) => d.interactive!)
        .filter((id) => map.getLayoutProperty(id, 'visibility') !== 'none');
    }

    function featureAt(point: maplibregl.Point): MapGeoJSONFeature | undefined {
      const layers = interactiveLayers();
      if (!layers.length) return undefined;
      const pad = 5;
      return map.queryRenderedFeatures(
        [
          [point.x - pad, point.y - pad],
          [point.x + pad, point.y + pad],
        ],
        { layers },
      )[0];
    }

    map.on('click', (e) => {
      const f = featureAt(e.point);
      const set = useStore.getState().setCard;
      if (f) {
        const def = layerToDef.get(f.layer.id);
        const card = def?.identify?.(f, map);
        if (card) set(card);
        return;
      }
      const p: LngLat = [e.lngLat.lng, e.lngLat.lat];
      const { layers } = useStore.getState();
      const inside = inMinnesota(p);
      const samples = inside
        ? LAYERS.filter((d) => layers[d.id].visible && d.sample)
            .map((d) => d.sample!(e.lngLat))
            .filter((x): x is { label: string; value: string } => !!x)
        : [];
      const { city } = nearestCity(p);
      set({
        kicker: inside ? 'Location' : 'Outside Minnesota',
        title: relativePlace(p),
        subtitle: `${p[1].toFixed(4)}° N, ${Math.abs(p[0]).toFixed(4)}° W`,
        accent: '#5eead4',
        stats: [
          ...samples.map((s) => ({ label: s.label, value: s.value })),
          { label: `Distance to ${city.name}`, value: `${Math.round(distanceKm(p, city.coord) * 0.621)} mi` },
        ],
        source: samples.length ? 'Values from active layers' : undefined,
        mock: samples.length > 0,
        highlight: { type: 'Point', coordinates: p },
      });
    });

    let hoverFrame = 0;
    map.on('mousemove', (e) => {
      cancelAnimationFrame(hoverFrame);
      hoverFrame = requestAnimationFrame(() => {
        const f = featureAt(e.point);
        const tip = tooltip.current!;
        const def = f && layerToDef.get(f.layer.id);
        const label = f && def?.hoverLabel?.(f);
        map.getCanvas().style.cursor = f ? 'pointer' : '';
        if (label) {
          tip.textContent = label;
          tip.style.transform = `translate(${e.point.x + 14}px, ${e.point.y + 14}px)`;
          tip.dataset.show = 'true';
        } else tip.dataset.show = 'false';
      });
    });
    map.on('mouseout', () => {
      if (tooltip.current) tooltip.current.dataset.show = 'false';
    });

    map.on('moveend', () => {
      const c = map.getCenter();
      useStore.getState().setView({ center: [c.lng, c.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() });
    });

    // --- animation loop ------------------------------------------------------

    let raf = 0;
    const loop = (now: number) => {
      const t = now / 1000;
      const { layers, card } = useStore.getState();
      for (const def of LAYERS) {
        if (def.animate && installed.has(def.id) && layers[def.id].visible) {
          if (!reducedMotion) def.animate(map, t);
        }
      }
      if (card?.highlight && !reducedMotion) {
        const k = (Math.sin(t * 3.2) + 1) / 2;
        map.setPaintProperty('hl-ring', 'circle-radius', 10 + k * 10);
        map.setPaintProperty('hl-ring', 'circle-stroke-opacity', 0.9 - k * 0.6);
        map.setPaintProperty('hl-glow', 'line-opacity', 0.3 + k * 0.4);
      }
      raf = requestAnimationFrame(loop);
    };

    // --- store subscriptions -------------------------------------------------

    const unsubs: (() => void)[] = [];
    // Install on 'style.load' rather than 'load': 'load' waits for a render after
    // every tile settles, which never comes if remote basemap tiles fail.
    map.once('style.load', () => {
      installHighlight();
      syncAll();
      useMapReady.setState({ map });
      if (import.meta.env.DEV) (window as unknown as { __map: unknown }).__map = map;
      raf = requestAnimationFrame(loop);

      const padFor = (open: boolean) => ({ left: open && window.innerWidth > 720 ? 360 : 0, top: 0, right: 0, bottom: 0 });
      map.setPadding(padFor(useStore.getState().panelOpen));

      if (!START_FROM_HASH) {
        map.easeTo({ ...DEFAULT_VIEW, duration: reducedMotion ? 0 : 2600, easing: (x) => 1 - (1 - x) ** 3 });
      }

      unsubs.push(
        useStore.subscribe((s, prev) => {
          if (s.layers !== prev.layers) syncAll();
          if (s.basemap !== prev.basemap) {
            applyBasemap(map, s.basemap);
            for (const id of installed) LAYER_BY_ID[id].onBasemap?.(map, s.basemap);
          }
          if (s.card !== prev.card) setHighlight(s.card);
          if (s.panelOpen !== prev.panelOpen) map.easeTo({ padding: padFor(s.panelOpen), duration: 450 });
          if (s.flyTarget && s.flyTarget !== prev.flyTarget) {
            const { center, zoom, pitch, bearing } = s.flyTarget;
            map.flyTo({ center, zoom, pitch: pitch ?? map.getPitch(), bearing: bearing ?? 0, duration: reducedMotion ? 0 : 2400, curve: 1.5, essential: true });
          }
        }),
      );
    });

    // Remote tiles failing (offline, blocked) shouldn't spam the console —
    // the self-hosted land/water layers carry the map.
    map.on('error', (e) => {
      const msg = String(e.error?.message ?? '');
      if (!/Failed to fetch|NetworkError|AJAXError|404|403/.test(msg)) console.warn(e.error);
    });

    return () => {
      cancelAnimationFrame(raf);
      unsubs.forEach((u) => u());
      useMapReady.setState({ map: null });
      map.remove();
    };
  }, []);

  return (
    <>
      <div ref={container} className="map" role="application" aria-label="Interactive map of Minnesota" />
      <div ref={tooltip} className="map-tooltip" data-show="false" aria-hidden="true" />
    </>
  );
}

