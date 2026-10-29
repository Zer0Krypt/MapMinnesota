// Minimal inline icon set (24×24, stroke-based) — no icon font, no network.
const PATHS: Record<string, string> = {
  layers: 'M12 3 2 8.5 12 14l10-5.5L12 3Z M2 13.5 12 19l10-5.5 M2 17.5 12 23l10-5.5',
  cloud: 'M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 9.6 4.2 4.2 0 0 0 7 18Z',
  tree: 'M12 2 6 10h3l-4 6h5v6h4v-6h5l-4-6h3L12 2Z',
  road: 'M8 2 4 22 M16 2l4 20 M12 4v3 M12 10.5v3 M12 17v3',
  people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M2 21a7 7 0 0 1 14 0 M16 3.5a4 4 0 0 1 0 7.5 M22 21a7 7 0 0 0-4-6.3',
  leaf: 'M11 20A7 7 0 0 1 4 13c0-6 5-10 16-10 0 9-3 17-9 17Z M4 21c3-6 7-9 11-11',
  shield: 'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z',
  parcel: 'M3 3h8v8H3z M13 3h8v5h-8z M13 10h8v11h-8z M3 13h8v8H3z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z M21 21l-4.3-4.3',
  share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7 M16 6l-4-4-4 4 M12 2v13',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 16v-4 M12 8h.01',
  close: 'M18 6 6 18 M6 6l12 12',
  chevron: 'm6 9 6 6 6-6',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  compass: 'M12 2 15 12H9L12 2Z M12 22 9 12h6l-3 10Z',
  cube: 'M12 2 3 7v10l9 5 9-5V7l-9-5Z M3 7l9 5 9-5 M12 12v10',
  home: 'M3 11 12 3l9 8 M5 9.5V21h14V9.5',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  pin: 'M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  sparkle: 'M12 2v6 M12 16v6 M2 12h6 M16 12h6 M5 5l3.5 3.5 M15.5 15.5 19 19 M19 5l-3.5 3.5 M8.5 15.5 5 19',
  water: 'M12 2.5S5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-7-12.5-7-12.5Z',
  external: 'M14 3h7v7 M21 3l-9 9 M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z M9 4v14 M15 6v14',
};

export default function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  );
}

/** The MapMinnesota mark: a north star over a lake horizon. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="mm-aurora" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="0.55" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#0a1424" stroke="url(#mm-aurora)" strokeOpacity="0.55" />
      <path d="M20 6.5 22.6 15.4 31.5 18 22.6 20.6 20 29.5 17.4 20.6 8.5 18 17.4 15.4Z" fill="url(#mm-aurora)" />
      <path d="M8 31.5c3.5-1.6 6.5-1.6 10 0s6.5 1.6 10 0 3.2-1.2 4-1.4" stroke="#38bdf8" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}
