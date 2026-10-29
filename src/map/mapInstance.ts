import type { Map as MLMap } from 'maplibre-gl';
import { create } from 'zustand';

// The MapLibre instance lives outside React state; components that need to
// drive the camera read it from here once `ready` flips.
export const useMapReady = create<{ map: MLMap | null }>(() => ({ map: null }));

export const getMap = () => useMapReady.getState().map;
