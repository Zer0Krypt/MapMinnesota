import { useEffect, useMemo, useRef, useState } from 'react';
import { lakes, parks } from '../data/mock';
import { CITIES, TOURS } from '../data/places';
import type { Card } from '../layers/types';
import { useStore } from '../store';
import Icon from './Icon';

interface Hit {
  kind: 'City' | 'State park' | 'Lake' | 'Region';
  name: string;
  detail: string;
  center: [number, number];
  zoom: number;
  card?: Card;
}

// Local gazetteer for the prototype. Swap for the DNR Gazetteer / a geocoder later.
function buildIndex(): Hit[] {
  const hits: Hit[] = [];
  for (const t of TOURS) hits.push({ kind: 'Region', name: t.name, detail: 'Explore', center: t.center, zoom: t.zoom });
  for (const c of CITIES)
    hits.push({
      kind: 'City',
      name: c.name,
      detail: `Pop. ${c.pop.toLocaleString('en-US')}`,
      center: c.coord,
      zoom: c.tier === 1 ? 10 : 11,
      card: { kicker: 'City', title: c.name, accent: '#e6edf7', stats: [{ label: 'Population', value: c.pop.toLocaleString('en-US') }], highlight: { type: 'Point', coordinates: c.coord } },
    });
  for (const f of parks().features) {
    const p = f.properties!;
    hits.push({ kind: 'State park', name: p.name, detail: p.kind, center: f.geometry.coordinates as [number, number], zoom: 11.5 });
  }
  const seen = new Set<string>();
  for (const f of lakes().features) {
    const p = f.properties!;
    if (!p.major || seen.has(p.name)) continue;
    seen.add(p.name);
    const ring = f.geometry.coordinates[0];
    const cx = ring.reduce((s, c) => s + c[0], 0) / ring.length;
    const cy = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    hits.push({ kind: 'Lake', name: p.name, detail: `${p.acres.toLocaleString('en-US')} acres`, center: [cx, cy], zoom: 9.5 });
  }
  return hits;
}

const KIND_ICON: Record<Hit['kind'], string> = { City: 'pin', 'State park': 'tree', Lake: 'water', Region: 'map' };

export default function Search() {
  const index = useMemo(buildIndex, []);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { flyTo, setCard } = useStore.getState();

  // "/" focuses search from anywhere (unless already typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return index
      .map((h) => ({ h, i: h.name.toLowerCase().indexOf(s) }))
      .filter((x) => x.i >= 0)
      .sort((a, b) => a.i - b.i || a.h.name.length - b.h.name.length)
      .slice(0, 7)
      .map((x) => x.h);
  }, [q, index]);

  const choose = (h: Hit) => {
    flyTo({ center: h.center, zoom: h.zoom, pitch: h.kind === 'Region' ? undefined : 30 });
    setCard(h.card ?? (h.kind === 'Region' ? null : { kicker: h.kind, title: h.name, subtitle: h.detail, accent: '#5eead4', highlight: { type: 'Point', coordinates: h.center } }));
    setQ('');
    input.current?.blur();
  };

  const open = focused && results.length > 0;

  return (
    <div className="search glass" data-open={open}>
      <Icon name="search" size={17} />
      <input
        ref={input}
        value={q}
        placeholder="Search places, parks, lakes…"
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(results.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter' && results[active]) choose(results[active]);
          else if (e.key === 'Escape') setQ('');
        }}
        role="combobox"
        aria-expanded={open}
        aria-controls="search-results"
        aria-activedescendant={open ? `search-hit-${active}` : undefined}
        aria-label="Search Minnesota"
      />
      <kbd className="search-kbd">/</kbd>
      {open && (
        <ul id="search-results" className="search-results glass" role="listbox">
          {results.map((h, i) => (
            <li
              key={`${h.kind}-${h.name}`}
              id={`search-hit-${i}`}
              role="option"
              aria-selected={i === active}
              data-active={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(h);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <Icon name={KIND_ICON[h.kind]} size={15} />
              <span className="hit-name">{h.name}</span>
              <span className="hit-detail">
                {h.kind} · {h.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
