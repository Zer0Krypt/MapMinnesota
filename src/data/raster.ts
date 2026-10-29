import { type Ramp, sampleRamp } from './color';
import { latFromMercY, type LngLat, MN_BOUNDS, MN_OUTLINE, mercY } from './geo';

export interface FieldRaster {
  url: string;
  coordinates: [LngLat, LngLat, LngLat, LngLat]; // TL, TR, BR, BL
}

/**
 * Render a scalar field over Minnesota into a PNG data URL, sampled in
 * web-mercator space so it lines up with the map, and clipped (anti-aliased)
 * to the state outline.
 */
export function renderField(
  field: (p: LngLat) => number, // returns 0..1 (NaN = transparent)
  ramp: Ramp,
  { width = 720, alpha = 235, fadeLow = false }: { width?: number; alpha?: number; fadeLow?: boolean } = {},
): FieldRaster {
  const [[x0, y0], [x1, y1]] = MN_BOUNDS;
  const my0 = mercY(y0);
  const my1 = mercY(y1);
  const lngSpan = ((x1 - x0) * Math.PI) / 180;
  const height = Math.round((width * (my1 - my0)) / lngSpan);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  for (let j = 0; j < height; j++) {
    const lat = latFromMercY(my1 - ((j + 0.5) / height) * (my1 - my0));
    for (let i = 0; i < width; i++) {
      const lng = x0 + ((i + 0.5) / width) * (x1 - x0);
      const v = field([lng, lat]);
      const k = (j * width + i) * 4;
      if (Number.isNaN(v)) continue;
      const [r, g, b] = sampleRamp(ramp, v);
      img.data[k] = r;
      img.data[k + 1] = g;
      img.data[k + 2] = b;
      img.data[k + 3] = fadeLow ? alpha * Math.min(1, Math.max(0, v * 1.8 - 0.08)) : alpha;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Clip to the state outline.
  const toPx = ([lng, lat]: LngLat): [number, number] => [
    ((lng - x0) / (x1 - x0)) * width,
    ((my1 - mercY(lat)) / (my1 - my0)) * height,
  ];
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  MN_OUTLINE.forEach((p, i) => {
    const [px, py] = toPx(p);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();

  return {
    url: canvas.toDataURL('image/png'),
    coordinates: [[x0, y1], [x1, y1], [x1, y0], [x0, y0]],
  };
}
