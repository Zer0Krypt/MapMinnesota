import { cssGradient } from '../data/color';
import type { Legend as LegendSpec } from '../layers/types';

export default function Legend({ legend }: { legend: LegendSpec }) {
  if (legend.kind === 'note') return <p className="legend-note">{legend.text}</p>;
  if (legend.kind === 'gradient') {
    return (
      <div className="legend-gradient">
        <div className="legend-bar" style={{ background: cssGradient(legend.ramp) }} />
        <div className="legend-labels">
          {legend.labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
        {legend.unit && <div className="legend-unit">{legend.unit}</div>}
      </div>
    );
  }
  return (
    <ul className="legend-swatches">
      {legend.items.map((it) => (
        <li key={it.label}>
          <span className={`swatch swatch-${it.shape ?? 'dot'}`} style={{ '--c': it.color } as React.CSSProperties} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
