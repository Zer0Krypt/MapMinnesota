// Smaller pieces of map chrome: header, controls, basemap switcher, tours,
// attribution, toast and the about dialog.
import { useEffect, useState } from 'react';
import { TOURS } from '../data/places';
import { LAYERS } from '../layers';
import { BASEMAPS, type BasemapId } from '../map/basemaps';
import { getMap, useMapReady } from '../map/mapInstance';
import { DEFAULT_VIEW, useStore } from '../store';
import Icon, { Logo } from './Icon';
import Search from './Search';

export function Header() {
  const { setAboutOpen, showToast, setPanelOpen } = useStore.getState();
  const panelOpen = useStore((s) => s.panelOpen);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ title: 'MapMinnesota', url });
      else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied — it restores this exact view and layers');
      }
    } catch {
      showToast('Copy the address bar to share this view');
    }
  };

  return (
    <header className="topbar">
      <div className="brand glass">
        <Logo />
        <div className="brand-text">
          <h1>
            Map<span>Minnesota</span>
          </h1>
          <p>Prototype · mock data</p>
        </div>
      </div>
      <Search />
      <div className="top-actions">
        <button type="button" className="icon-btn glass layers-fab" data-active={panelOpen} onClick={() => setPanelOpen(!panelOpen)} aria-label="Toggle layer panel">
          <Icon name="layers" />
        </button>
        <button type="button" className="btn glass" onClick={share}>
          <Icon name="share" size={16} />
          <span>Share</span>
        </button>
        <button type="button" className="icon-btn glass" onClick={() => setAboutOpen(true)} aria-label="About MapMinnesota">
          <Icon name="info" />
        </button>
      </div>
    </header>
  );
}

export function MapControls() {
  const map = useMapReady((s) => s.map);
  const bearing = useStore((s) => s.view.bearing);
  const pitch = useStore((s) => s.view.pitch);
  const [liveBearing, setLiveBearing] = useState(bearing);

  useEffect(() => {
    if (!map) return;
    const onRotate = () => setLiveBearing(map.getBearing());
    map.on('rotate', onRotate);
    return () => {
      map.off('rotate', onRotate);
    };
  }, [map]);

  const is3D = pitch > 10;
  return (
    <div className="controls">
      <div className="control-group glass">
        <button type="button" className="icon-btn ghost" onClick={() => getMap()?.zoomIn()} aria-label="Zoom in">
          <Icon name="plus" />
        </button>
        <button type="button" className="icon-btn ghost" onClick={() => getMap()?.zoomOut()} aria-label="Zoom out">
          <Icon name="minus" />
        </button>
      </div>
      <div className="control-group glass">
        <button type="button" className="icon-btn ghost compass" onClick={() => getMap()?.easeTo({ bearing: 0, pitch: 0, duration: 800 })} aria-label="Reset north">
          <span style={{ transform: `rotate(${-liveBearing}deg)` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2 15.5 12h-7L12 2Z" fill="#f87171" />
              <path d="M12 22 8.5 12h7L12 22Z" fill="currentColor" opacity="0.55" />
            </svg>
          </span>
        </button>
        <button type="button" className="icon-btn ghost" data-active={is3D} onClick={() => getMap()?.easeTo({ pitch: is3D ? 0 : 55, duration: 900 })} aria-label={is3D ? 'Switch to 2D' : 'Tilt to 3D'}>
          <span className="txt-btn">{is3D ? '2D' : '3D'}</span>
        </button>
        <button type="button" className="icon-btn ghost" onClick={() => useStore.getState().flyTo({ ...DEFAULT_VIEW })} aria-label="Show all of Minnesota">
          <Icon name="home" />
        </button>
      </div>
    </div>
  );
}

export function BasemapSwitcher() {
  const basemap = useStore((s) => s.basemap);
  const setBasemap = useStore((s) => s.setBasemap);
  const [open, setOpen] = useState(false);
  const current = BASEMAPS[basemap];

  return (
    <div className="basemaps" data-open={open} onMouseLeave={() => setOpen(false)}>
      {open && (
        <div className="basemap-list glass" role="radiogroup" aria-label="Basemap">
          {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={id === basemap}
              className="basemap-opt"
              data-active={id === basemap}
              onClick={() => {
                setBasemap(id);
                setOpen(false);
              }}
              title={BASEMAPS[id].blurb}
            >
              <span className="basemap-thumb" style={{ background: BASEMAPS[id].swatch }} />
              <span>{BASEMAPS[id].name}</span>
            </button>
          ))}
        </div>
      )}
      <button type="button" className="basemap-current glass" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Basemap: ${current.name}. Change basemap`}>
        <span className="basemap-thumb" style={{ background: current.swatch }} />
        <span className="basemap-label">{current.name}</span>
      </button>
    </div>
  );
}

export function Tours() {
  const flyTo = useStore((s) => s.flyTo);
  return (
    <nav className="tours" aria-label="Explore regions">
      <span className="tours-label">
        <Icon name="sparkle" size={14} /> Explore
      </span>
      {TOURS.map((t) => (
        <button key={t.name} type="button" className="chip-btn glass" onClick={() => flyTo({ center: t.center, zoom: t.zoom, pitch: t.pitch ?? 0, bearing: t.bearing ?? 0 })}>
          {t.name}
        </button>
      ))}
    </nav>
  );
}

const BASEMAP_CREDIT: Record<BasemapId, string> = {
  midnight: '© OpenStreetMap contributors © CARTO',
  daylight: '© OpenStreetMap contributors © CARTO',
  satellite: 'Imagery © Esri, Maxar, Earthstar Geographics',
  northwoods: 'Basemap: MapMinnesota',
};

export function Attribution() {
  const layers = useStore((s) => s.layers);
  const basemap = useStore((s) => s.basemap);
  const sources = [...new Set(LAYERS.filter((l) => layers[l.id].visible).map((l) => l.source.name))];
  return (
    <footer className="attribution">
      <span>{BASEMAP_CREDIT[basemap]}</span>
      {sources.length > 0 && <span title={sources.join(' · ')}>Data: {sources.join(' · ')}</span>}
      <a href="https://maplibre.org" target="_blank" rel="noreferrer">
        MapLibre
      </a>
    </footer>
  );
}

export function Toast() {
  const toast = useStore((s) => s.toast);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div className="toast glass" data-show={visible} role="status">
      {toast?.text}
    </div>
  );
}

export function About() {
  const open = useStore((s) => s.aboutOpen);
  const setOpen = useStore((s) => s.setAboutOpen);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div className="modal glass" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn ghost modal-close" onClick={() => setOpen(false)} aria-label="Close">
          <Icon name="close" />
        </button>
        <Logo size={44} />
        <h2 id="about-title">
          Map<span>Minnesota</span>
        </h2>
        <p className="lead">An interactive atlas for exploring the North Star State — weather, water, roads, people and public lands, all on one beautiful map.</p>
        <div className="notice">
          <strong>This is a UI prototype.</strong> Apart from the terrain hillshade and reference geography, every layer is driven by
          procedurally generated <em>mock data</em> shaped to feel plausible. Don't use it for decisions.
        </div>
        <h3>Planned data sources</h3>
        <ul className="source-list">
          {[...new Map(LAYERS.map((l) => [l.source.name, l.source])).values()].map((s) => (
            <li key={s.name}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.name}
                </a>
              ) : (
                s.name
              )}
            </li>
          ))}
        </ul>
        <h3>Tips</h3>
        <ul className="tips">
          <li>
            Press <kbd>/</kbd> to search. Click anything on the map for details; click empty ground for “what’s here.”
          </li>
          <li>Right-drag (or two-finger drag) to tilt and rotate. Try Census demographics → 3D columns.</li>
          <li>The URL always reflects your view — share it to share exactly what you see.</li>
        </ul>
      </div>
    </div>
  );
}
