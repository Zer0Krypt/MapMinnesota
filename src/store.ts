import { create } from 'zustand';
import { MN_CENTER } from './data/geo';
import { LAYER_BY_ID, LAYERS } from './layers';
import type { Card, LayerOptions, OptionValue } from './layers/types';
import { BASEMAPS, type BasemapId } from './map/basemaps';

export interface LayerState {
  visible: boolean;
  opacity: number;
  options: LayerOptions;
}

export interface View {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface FlyTarget {
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
  /** Bumps on every request so repeated flights to the same spot still fire. */
  id: number;
}

interface State {
  basemap: BasemapId;
  layers: Record<string, LayerState>;
  view: View;
  card: Card | null;
  flyTarget: FlyTarget | null;
  panelOpen: boolean;
  aboutOpen: boolean;
  toast: { text: string; id: number } | null;

  setBasemap: (b: BasemapId) => void;
  toggleLayer: (id: string, visible?: boolean) => void;
  setOpacity: (id: string, opacity: number) => void;
  setOption: (id: string, key: string, value: OptionValue) => void;
  resetLayers: () => void;
  setView: (v: View) => void;
  setCard: (c: Card | null) => void;
  flyTo: (t: Omit<FlyTarget, 'id'>) => void;
  setPanelOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  showToast: (text: string) => void;
}

export const DEFAULT_VIEW: View = { center: MN_CENTER, zoom: 5.75, bearing: 0, pitch: 0 };

const defaultLayers = (): Record<string, LayerState> =>
  Object.fromEntries(
    LAYERS.map((l) => [l.id, { visible: l.defaultVisible, opacity: l.defaultOpacity, options: { ...(l.defaultOptions ?? {}) } }]),
  );

// ---------------------------------------------------------------------------
// URL hash  ⇄  state   (#v=zoom/lat/lng/bearing/pitch&b=basemap&l=id:op,...&o=id.key:val;...)
// ---------------------------------------------------------------------------

function parseHash(): Partial<Pick<State, 'basemap' | 'layers' | 'view'>> & { hasView: boolean } {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const out: Partial<Pick<State, 'basemap' | 'layers' | 'view'>> & { hasView: boolean } = { hasView: false };

  const v = params.get('v')?.split('/').map(Number);
  if (v && v.length >= 3 && v.every((n) => Number.isFinite(n))) {
    out.view = { zoom: v[0], center: [v[2], v[1]], bearing: v[3] ?? 0, pitch: v[4] ?? 0 };
    out.hasView = true;
  }
  const b = params.get('b') as BasemapId | null;
  if (b && b in BASEMAPS) out.basemap = b;

  const l = params.get('l');
  const o = params.get('o');
  if (l !== null || o !== null) {
    const layers = defaultLayers();
    if (l !== null) {
      for (const s of Object.values(layers)) s.visible = false;
      for (const entry of l.split(',').filter(Boolean)) {
        const [id, op] = entry.split(':');
        if (!layers[id]) continue;
        layers[id].visible = true;
        if (op !== undefined && Number.isFinite(Number(op))) layers[id].opacity = Math.min(1, Math.max(0, Number(op) / 100));
      }
    }
    for (const entry of (o ?? '').split(';').filter(Boolean)) {
      const [path, raw] = entry.split(':');
      const [id, key] = path.split('.');
      if (!layers[id] || raw === undefined) continue;
      const def = LAYER_BY_ID[id].options?.find((x) => x.key === key);
      if (!def) continue;
      layers[id].options[key] = def.type === 'toggle' ? raw === '1' : raw;
    }
    out.layers = layers;
  }
  return out;
}

export function serializeHash(s: Pick<State, 'basemap' | 'layers' | 'view'>): string {
  const { view } = s;
  const parts = [
    `v=${view.zoom.toFixed(2)}/${view.center[1].toFixed(4)}/${view.center[0].toFixed(4)}/${Math.round(view.bearing)}/${Math.round(view.pitch)}`,
    `b=${s.basemap}`,
  ];
  const l = LAYERS.filter((d) => s.layers[d.id].visible).map((d) => {
    const op = Math.round(s.layers[d.id].opacity * 100);
    return op === Math.round(d.defaultOpacity * 100) ? d.id : `${d.id}:${op}`;
  });
  parts.push(`l=${l.join(',')}`);
  const o: string[] = [];
  for (const d of LAYERS) {
    for (const [k, val] of Object.entries(s.layers[d.id].options)) {
      if (d.defaultOptions?.[k] === val) continue;
      o.push(`${d.id}.${k}:${typeof val === 'boolean' ? (val ? 1 : 0) : val}`);
    }
  }
  if (o.length) parts.push(`o=${o.join(';')}`);
  return `#${parts.join('&')}`;
}

const initial = parseHash();
export const START_FROM_HASH = initial.hasView;

let flyId = 0;
let toastId = 0;

export const useStore = create<State>((set) => ({
  basemap: initial.basemap ?? 'midnight',
  layers: initial.layers ?? defaultLayers(),
  view: initial.view ?? DEFAULT_VIEW,
  card: null,
  flyTarget: null,
  panelOpen: typeof window !== 'undefined' ? window.innerWidth > 720 : true,
  aboutOpen: false,
  toast: null,

  setBasemap: (basemap) => set({ basemap }),
  toggleLayer: (id, visible) =>
    set((s) => ({ layers: { ...s.layers, [id]: { ...s.layers[id], visible: visible ?? !s.layers[id].visible } } })),
  setOpacity: (id, opacity) => set((s) => ({ layers: { ...s.layers, [id]: { ...s.layers[id], opacity } } })),
  setOption: (id, key, value) =>
    set((s) => ({ layers: { ...s.layers, [id]: { ...s.layers[id], options: { ...s.layers[id].options, [key]: value } } } })),
  resetLayers: () => set({ layers: defaultLayers() }),
  setView: (view) => set({ view }),
  setCard: (card) => set({ card }),
  flyTo: (t) => set({ flyTarget: { ...t, id: ++flyId } }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setAboutOpen: (aboutOpen) => set({ aboutOpen }),
  showToast: (text) => set({ toast: { text, id: ++toastId } }),
}));

// Keep the URL in sync (replaceState — no history spam).
let hashTimer: number | undefined;
useStore.subscribe((s, prev) => {
  if (s.view === prev.view && s.layers === prev.layers && s.basemap === prev.basemap) return;
  window.clearTimeout(hashTimer);
  hashTimer = window.setTimeout(() => {
    history.replaceState(null, '', serializeHash(useStore.getState()));
  }, 250);
});
