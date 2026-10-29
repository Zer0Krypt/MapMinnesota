import { useId, useState } from 'react';

interface Props {
  values: number[];
  color: string;
  start: string;
  end: string;
  format?: (v: number) => string;
  labelAt?: (i: number) => string;
}

/** Tiny area chart with a scrubbable readout. */
export default function Sparkline({ values, color, start, end, format = (v) => v.toFixed(0), labelAt }: Props) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const w = 300;
  const h = 64;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - 6 - ((v - min) / span) * (h - 14);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const idx = hover ?? values.length - 1;

  return (
    <div className="spark">
      <div className="spark-readout">
        <strong>{format(values[idx])}</strong>
        <span>{hover === null ? end : (labelAt?.(idx) ?? (/^\d{4}$/.test(start) ? String(Number(start) + idx) : ''))}</span>
      </div>
      <div className="spark-plot">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.round(((e.clientX - r.left) / r.width) * (values.length - 1)));
        }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Trend from ${format(values[0])} to ${format(values[values.length - 1])}`}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.35" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line}L${w},${h}L0,${h}Z`} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <line x1={x(idx)} x2={x(idx)} y1="0" y2={h} stroke="currentColor" strokeOpacity="0.25" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="spark-dot" style={{ left: `${(x(idx) / w) * 100}%`, top: `${(y(values[idx]) / h) * 100}%`, background: color }} />
      </div>
      <div className="spark-axis">
        <span>{start}</span>
        <span>{end}</span>
      </div>
    </div>
  );
}
