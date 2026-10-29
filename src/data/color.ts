// Color ramps shared by map styles, canvas rasters and legends,
// so a legend always matches what is drawn.

export type Ramp = string[];

export const RAMPS = {
  // Sequential, perceptually even-ish. Hand-tuned to glow on dark basemaps.
  aurora: ['#0b1d3a', '#164a7a', '#1f8a9a', '#4cc9a0', '#b6ef8a', '#fff6a8'],
  ember: ['#1a1033', '#4b2378', '#9a3b7f', '#e0606a', '#f7a35c', '#ffe7a3'],
  lichen: ['#0a2a2f', '#0f5a5c', '#2f8f83', '#7cc4a4', '#cde8c4', '#f4f8e4'],
  forest: ['#16231c', '#1d3d29', '#245c34', '#2f7d3b', '#56a349', '#9fd36b'],
  temperature: ['#2c3e94', '#3f7dc4', '#5fb4d6', '#9fd8c6', '#f2e6a0', '#f6b26b', '#e8684a', '#b8253f'],
  divergingChange: ['#c2364a', '#e9876b', '#f3d9c4', '#cfe3ef', '#6fa8d6', '#2867b0'],
  radar: ['rgba(0,0,0,0)', '#1fbf8f', '#58d65b', '#d9e84a', '#f7b733', '#f0613a', '#c42d6e'],
  traffic: ['#3ddc97', '#c6e85a', '#f7c548', '#f58b3d', '#e5484d'],
} satisfies Record<string, Ramp>;

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Sample a ramp at t ∈ [0,1] → [r,g,b]. */
export function sampleRamp(ramp: Ramp, t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(ramp[i]);
  const b = hexToRgb(ramp[i + 1]);
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/** Build a MapLibre `interpolate` expression over 0..1 for a ramp. */
export function rampExpression(ramp: Ramp, input: unknown): unknown[] {
  const expr: unknown[] = ['interpolate', ['linear'], input];
  ramp.forEach((c, i) => expr.push(i / (ramp.length - 1), c));
  return expr;
}

export const cssGradient = (ramp: Ramp) =>
  `linear-gradient(90deg, ${ramp.map((c, i) => `${c} ${(i / (ramp.length - 1)) * 100}%`).join(', ')})`;
