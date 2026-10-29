import { useEffect } from 'react';
import { About, Attribution, BasemapSwitcher, Header, MapControls, Toast, Tours } from './components/Chrome';
import InfoCard from './components/InfoCard';
import LayerPanel from './components/LayerPanel';
import { BASEMAPS } from './map/basemaps';
import MapView from './map/MapView';
import { useStore } from './store';

export default function App() {
  const basemap = useStore((s) => s.basemap);
  const cardOpen = useStore((s) => !!s.card);

  useEffect(() => {
    const theme = BASEMAPS[basemap].theme;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#eef2f6' : '#070d18');
  }, [basemap]);

  return (
    <div className="app" data-card={cardOpen}>
      <MapView />
      <div className="vignette" aria-hidden="true" />
      <Header />
      <LayerPanel />
      <InfoCard />
      <Tours />
      <div className="bottom-right">
        <MapControls />
        <BasemapSwitcher />
      </div>
      <Attribution />
      <Toast />
      <About />
    </div>
  );
}
