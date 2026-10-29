import { useMemo, useState } from 'react';
import { CATEGORIES, LAYERS } from '../layers';
import type { LayerDef } from '../layers/types';
import { useStore } from '../store';
import Icon from './Icon';
import Legend from './Legend';

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch" data-on={on} onClick={() => onChange(!on)}>
      <span className="switch-knob" />
    </button>
  );
}

function LayerRow({ def }: { def: LayerDef }) {
  const state = useStore((s) => s.layers[def.id]);
  const zoom = useStore((s) => s.view.zoom);
  const { toggleLayer, setOpacity, setOption } = useStore.getState();
  const [open, setOpen] = useState(false);
  const legend = typeof def.legend === 'function' ? def.legend(state.options) : def.legend;
  const tooFar = state.visible && def.minzoom !== undefined && zoom < def.minzoom - 0.5;
  const expanded = open || state.visible;

  return (
    <li className="layer" data-on={state.visible}>
      <div className="layer-head">
        <Toggle on={state.visible} onChange={(v) => toggleLayer(def.id, v)} label={`Show ${def.name}`} />
        <button type="button" className="layer-title" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="layer-name">{def.name}</span>
          {def.mock && <span className="badge" title="Synthetic data for this prototype">mock</span>}
        </button>
        <button type="button" className="icon-btn ghost small" onClick={() => setOpen(!open)} aria-label={`${open ? 'Hide' : 'Show'} details for ${def.name}`}>
          <Icon name="chevron" size={16} className={open ? 'rot-180' : ''} />
        </button>
      </div>

      {expanded && (
        <div className="layer-body">
          {open && <p className="layer-desc">{def.description}</p>}
          {tooFar && (
            <p className="layer-hint">
              <Icon name="info" size={13} /> Zoom in to see this layer
            </p>
          )}
          {state.visible && <Legend legend={legend} />}
          {state.visible && def.options?.map((o) =>
            o.type === 'select' ? (
              <label key={o.key} className="field">
                <span>{o.label}</span>
                <select value={String(state.options[o.key])} onChange={(e) => setOption(def.id, o.key, e.target.value)}>
                  {o.choices.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div key={o.key} className="field field-inline">
                <span>{o.label}</span>
                <Toggle on={!!state.options[o.key]} onChange={(v) => setOption(def.id, o.key, v)} label={o.label} />
              </div>
            ),
          )}
          {open && (
            <>
              <label className="field">
                <span>
                  Opacity <em>{Math.round(state.opacity * 100)}%</em>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(state.opacity * 100)}
                  onChange={(e) => setOpacity(def.id, Number(e.target.value) / 100)}
                  style={{ '--fill': `${state.opacity * 100}%` } as React.CSSProperties}
                  aria-label={`${def.name} opacity`}
                />
              </label>
              <p className="layer-source">
                Source:{' '}
                {def.source.url ? (
                  <a href={def.source.url} target="_blank" rel="noreferrer">
                    {def.source.name} <Icon name="external" size={11} />
                  </a>
                ) : (
                  def.source.name
                )}
                {def.mock && <span className="muted"> · values simulated</span>}
              </p>
            </>
          )}
        </div>
      )}
    </li>
  );
}

export default function LayerPanel() {
  const open = useStore((s) => s.panelOpen);
  const layers = useStore((s) => s.layers);
  const { setPanelOpen, resetLayers } = useStore.getState();
  const [filter, setFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const activeCount = Object.values(layers).filter((l) => l.visible).length;
  const q = filter.trim().toLowerCase();
  const groups = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        ...c,
        layers: LAYERS.filter((l) => l.category === c.id && (!q || `${l.name} ${l.description} ${c.name}`.toLowerCase().includes(q))),
      })).filter((g) => g.layers.length),
    [q],
  );

  return (
    <aside className="panel glass" data-open={open} aria-label="Map layers">
      <header className="panel-head">
        <div>
          <h2>Layers</h2>
          <p>
            {activeCount} active · {LAYERS.length} available
          </p>
        </div>
        <div className="panel-head-actions">
          <button type="button" className="icon-btn ghost" onClick={resetLayers} title="Reset layers" aria-label="Reset layers to defaults">
            <Icon name="reset" size={16} />
          </button>
          <button type="button" className="icon-btn ghost panel-close" onClick={() => setPanelOpen(false)} aria-label="Close layer panel">
            <Icon name="close" size={16} />
          </button>
        </div>
      </header>

      <div className="panel-filter">
        <Icon name="search" size={15} />
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter layers…" aria-label="Filter layers" />
      </div>

      <div className="panel-scroll">
        {groups.map((g) => {
          const isCollapsed = collapsed[g.id] && !q;
          const on = g.layers.filter((l) => layers[l.id].visible).length;
          return (
            <section key={g.id} className="group">
              <button type="button" className="group-head" onClick={() => setCollapsed({ ...collapsed, [g.id]: !collapsed[g.id] })} aria-expanded={!isCollapsed}>
                <Icon name={g.icon} size={15} />
                <span>{g.name}</span>
                {on > 0 && <span className="group-count">{on}</span>}
                <Icon name="chevron" size={15} className={isCollapsed ? 'rot-90' : ''} />
              </button>
              {!isCollapsed && (
                <ul>
                  {g.layers.map((l) => (
                    <LayerRow key={l.id} def={l} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
        {!groups.length && <p className="empty">No layers match “{filter}”.</p>}
      </div>
    </aside>
  );
}
