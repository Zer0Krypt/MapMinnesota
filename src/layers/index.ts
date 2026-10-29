import { cities, hillshade } from './base';
import { crime, lands, mpca } from './environment';
import { forest, parks, water } from './nature';
import { census } from './people';
import { highways, transit } from './transport';
import type { Category, LayerDef } from './types';
import { aurora, radar, temperature } from './weather';

export const CATEGORIES: Category[] = [
  { id: 'base', name: 'Base & reference', icon: 'layers' },
  { id: 'weather', name: 'Weather & sky', icon: 'cloud' },
  { id: 'nature', name: 'Natural resources', icon: 'tree' },
  { id: 'transport', name: 'Transportation', icon: 'road' },
  { id: 'people', name: 'People & demographics', icon: 'people' },
  { id: 'environment', name: 'Environment', icon: 'leaf' },
  { id: 'safety', name: 'Public safety', icon: 'shield' },
  { id: 'land', name: 'Land ownership', icon: 'parcel' },
];

/**
 * Every layer, in draw order (bottom → top). Adding a layer = write a LayerDef
 * and drop it in here; the panel, legend, URL state and identify all follow.
 */
export const LAYERS: LayerDef[] = [
  hillshade,
  forest,
  temperature,
  census,
  lands,
  water,
  highways,
  transit,
  radar,
  crime,
  mpca,
  parks,
  aurora,
  cities,
];

export const LAYER_BY_ID: Record<string, LayerDef> = Object.fromEntries(LAYERS.map((l) => [l.id, l]));
