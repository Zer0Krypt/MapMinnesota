// Helpers for "marching ants" flow animation on line layers.

/** Dash array for a [dash, gap] pattern shifted by phase ∈ [0,1). */
export function dashAt(dash: number, gap: number, phase: number): number[] {
  const total = dash + gap;
  const o = (((phase % 1) + 1) % 1) * total;
  return o < dash ? [dash - o, gap, o, 0] : [0, total - o, dash, o - dash];
}

/** Interpolate a point at fraction f (0..1) along a polyline. */
export function along(line: [number, number][], f: number): [number, number] {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < line.length; i++) {
    const d = Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
    seg.push(d);
    total += d;
  }
  let target = Math.min(1, Math.max(0, f)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i]) {
      const k = seg[i] ? target / seg[i] : 0;
      return [line[i][0] + (line[i + 1][0] - line[i][0]) * k, line[i][1] + (line[i + 1][1] - line[i][1]) * k];
    }
    target -= seg[i];
  }
  return line[line.length - 1];
}

/** Run `fn` at most `fps` times per second (keyed by layer). */
const last = new Map<string, number>();
export function throttle(key: string, t: number, fps: number): boolean {
  const prev = last.get(key) ?? -Infinity;
  if (t - prev < 1 / fps) return false;
  last.set(key, t);
  return true;
}
