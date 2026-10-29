import type { LngLat as MLLngLat, Map as MLMap, MapGeoJSONFeature } from 'maplibre-gl';
import type { BasemapId } from '../map/basemaps';

export type CategoryId =
  | 'base'
  | 'transport'
  | 'weather'
  | 'nature'
  | 'people'
  | 'environment'
  | 'safety'
  | 'land';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string; // key into components/Icon
}

export type Legend =
  | { kind: 'gradient'; ramp: string[]; labels: string[]; unit?: string }
  | { kind: 'swatches'; items: { color: string; label: string; shape?: 'dot' | 'line' | 'square' | 'ring' }[] }
  | { kind: 'note'; text: string };

export type OptionValue = string | boolean;
export type LayerOptions = Record<string, OptionValue>;

export type LayerOption =
  | { key: string; label: string; type: 'select'; choices: { value: string; label: string }[] }
  | { key: string; label: string; type: 'toggle' };

/** Content for the identify card shown when a feature (or spot) is clicked. */
export interface Card {
  kicker: string;
  title: string;
  subtitle?: string;
  accent?: string;
  stats?: { label: string; value: string }[];
  chips?: string[];
  series?: { label: string; values: number[]; start: string; end: string; format?: (v: number) => string; labelAt?: (i: number) => string };
  bar?: { label: string; value: number; color: string; caption: string };
  source?: string;
  mock?: boolean;
  /** Geometry to highlight on the map. */
  highlight?: GeoJSON.Geometry;
  center?: [number, number];
}

export interface LayerDef {
  id: string;
  name: string;
  category: CategoryId;
  description: string;
  /** True when the layer is driven by synthetic data. */
  mock: boolean;
  source: { name: string; url?: string };
  defaultVisible: boolean;
  defaultOpacity: number;
  /** Map layers kept at the top of their group (e.g. 3D extrusions over flat layers). */
  lift?: string[];
  /** Draw above the outside-Minnesota mask (points, labels, sky effects). */
  above?: boolean;
  /** Zoom level the layer starts drawing at (shown as a hint in the panel). */
  minzoom?: number;
  legend: Legend | ((opts: LayerOptions) => Legend);
  options?: LayerOption[];
  defaultOptions?: LayerOptions;

  /** Every MapLibre layer id this def owns (bottom → top). */
  mapLayers: string[];
  /** Subset of mapLayers shown for given options (defaults to all). */
  layersFor?: (opts: LayerOptions) => string[];
  /** Layers that respond to hover/click. */
  interactive?: string[];
  /** [mapLayerId, paintProperty, valueAtFullOpacity] — scaled by the opacity slider. */
  paint: [string, string, number][];

  install: (map: MLMap) => void;
  applyOptions?: (map: MLMap, opts: LayerOptions, prev: LayerOptions | undefined) => void;
  onBasemap?: (map: MLMap, basemap: BasemapId) => void;
  /** Per-frame hook while visible. t = seconds since start. */
  animate?: (map: MLMap, t: number) => void;
  identify?: (feature: MapGeoJSONFeature, map: MLMap) => Card | null;
  hoverLabel?: (feature: MapGeoJSONFeature) => string;
  /** Value at an arbitrary spot, for the "what's here" card. */
  sample?: (lngLat: MLLngLat) => { label: string; value: string } | null;
}
