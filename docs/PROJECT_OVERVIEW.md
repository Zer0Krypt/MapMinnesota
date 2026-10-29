# MapMinnesota – Project Overview Document

**Version:** 1.0  
**Date:** October 29, 2026  
**Purpose:** Comprehensive specification for an AI agent (or development team) to design, build, and launch MapMinnesota — a visually stunning, highly interactive statewide map exploration platform for Minnesota.

---

## 1. Vision & Goals

### Product Vision
MapMinnesota is the definitive interactive map of Minnesota. It is not a utilitarian GIS viewer. It is a beautiful, immersive experience that makes people *want* to explore the state. Users should feel curiosity and wonder as they toggle layers and watch data come alive on the map with elegant visualizations, smooth animations, thoughtful color design, and high-quality cartography.

### Primary Goals
- Become the go-to public website for exploring and learning about Minnesota.
- Offer a wide spectrum of layers: everyday (weather, roads, traffic) → specialized (census demographics, crime, DNR natural resources, land ownership, infrastructure, environmental sites).
- Prioritize visual excellence and user delight equally with data accuracy and performance.
- Remain free to use, with clear attribution to source agencies.
- Support both casual explorers and more serious users (researchers, planners, journalists, residents).

### Success Metrics (future)
- High engagement (time on site, layers toggled, zoom/pan activity).
- Positive qualitative feedback on beauty and usefulness.
- Shareability of map views / generated insights.

---

## 2. Core Experience & UX Principles

- **Map-first interface**: Full-screen (or near full-screen) interactive map as the centerpiece.
- **Layer panel**: Clean, organized, searchable, collapsible categories of layers. Clear on/off toggles + opacity controls + legend.
- **Visual hierarchy & beauty**: Custom basemaps or carefully styled base layers (dark mode option highly desirable). Thoughtful color ramps, gradients, particle effects where appropriate (e.g., weather, traffic flow), smooth transitions, subtle animations when layers load or change.
- **Exploration tools**: Search (places, addresses, counties), bookmark views, shareable deep links with current layer state + location, measurement tools, identify/popup info cards that are beautiful and informative.
- **Responsive**: Excellent on desktop, good on tablet, usable on mobile (layer panel adapts).
- **Performance**: Fast initial load, efficient vector/raster handling, progressive loading, tiling where possible. Avoid overwhelming the browser with too many simultaneous heavy layers.
- **Accessibility**: Keyboard navigation, sufficient contrast, screen-reader friendly layer controls and popups.

**Tone**: Curious, respectful of the landscape and data, modern Minnesota aesthetic (lakes, forests, prairie, northern lights inspiration optional in branding).

---

## 3. Recommended Technology Stack (Suggestions for Agent)

### Frontend
- Modern framework: React / Next.js or SvelteKit / Vue preferred for reactivity and performance.
- Mapping library: **MapLibre GL JS** (preferred — open, performant, beautiful) or Mapbox GL JS. Leaflet is acceptable as fallback but less ideal for visual richness.
- Styling: Tailwind CSS + custom CSS for map UI polish. Consider Framer Motion or similar for micro-interactions.
- State management: Zustand, Pinia, or built-in framework state for layer visibility, opacity, current view, etc.
- Charts/popups: Lightweight library (e.g., Chart.js, Observable Plot, or custom SVG) for demographic or time-series info in popups/side panels.

### Backend / Data Handling
- Prefer client-side consumption of public APIs and static/tiled assets where possible.
- Lightweight backend (Node, Cloudflare Workers, or similar) only if needed for:
  - Proxying CORS-restricted services
  - Caching / rate-limit protection
  - Pre-processing or tiling heavy datasets
  - Generating shareable view states
- Vector tiles (PMTiles, MVT) or GeoJSON for most layers; WMS/WMTS or raster tiles for imagery and some dense data.
- Host static assets and tiles on CDN (Cloudflare, AWS, etc.).

### Deployment
Vercel, Cloudflare Pages, Netlify, or similar with good edge performance.

---

## 4. Layer Categories & Priority Data Sources

Organize layers into clear groups in the UI. Below are high-value sources (many free/open). Prioritize statewide coverage and reliable, regularly updated sources.

### A. Base & Reference
- High-quality aerial imagery / orthophotos (MnGeo Geospatial Image Service – multiple years including recent FSA/NAIP and metro high-res).
- Hillshade / elevation (lidar-derived from MnGeo/DNR).
- Administrative boundaries (counties, cities, townships, legislative districts – Census TIGER + MnGeo).
- OpenStreetMap or carefully styled vector basemap as default.

### B. Transportation & Mobility
- Road centerlines, functional classification, trunk highways (MnDOT GIS / Minnesota Geospatial Commons).
- Traffic volumes (AADT / HCAADT) – MnDOT traffic data layers available via Geospatial Commons and ArcGIS Online.
- Real-time or near-real-time traffic / incidents (MnDOT 511 data if accessible via API or public feeds; otherwise static historical).
- Transit (Metro Transit routes/stops for Twin Cities; broader if available).
- Airports, trails, bike routes where available.

### C. Weather & Environment (Real-time + Historical)
- Current weather, forecasts, radar/Doppler-style layers (Open-Meteo excellent free option; National Weather Service; radar imagery feeds).
- Air quality, precipitation normals, climate departure maps (DNR / MPCA / NOAA-derived layers on Geospatial Commons).
- Flood zones / DFIRM (FEMA + DNR).

### D. Natural Resources & DNR
- Hydrography (lakes, rivers, streams, public waters) – DNR Hydrography Dataset (authoritative).
- Public water access sites, Wildlife Management Areas (WMAs), State Parks, Scientific & Natural Areas, State Forests.
- Forest inventory, native plant communities, invasive species observations, wild rice modeled presence.
- Springs, watersheds, trout lakes/streams, land cover.
- Source: Minnesota Geospatial Commons (DNR organization) + DNR Gazetteer API for place search.

### E. Demographics & Socioeconomics (Census)
- Population, age, race/ethnicity, income, education, housing, employment – US Census Bureau API (ACS 5-year especially useful) + pre-joined tract/block group layers available on Geospatial Commons or ArcGIS.
- Visualize as choropleths with elegant sequential/diverging color scales and smooth transitions.

### F. Crime & Public Safety
- Statewide crime statistics via Minnesota Crime Data Explorer (BCA) – downloadable CSVs and potential for mapping by county/agency.
- City-level (especially Minneapolis open data crime incidents).
- Aggregate carefully; provide clear time-period controls and rate calculations (per capita preferred).

### G. Environmental & Pollution (MPCA)
- What’s in My Neighborhood (WIMN) sites – remediation, permits, leak sites, brownfields, etc. (excellent GIS data on Geospatial Commons + REST API).
- Impaired waters, air permits, solid waste sites.

### H. Land Ownership & Cadastre
- Parcel data from opt-in open counties (MnGeo compiled statewide opt-in parcels – currently ~59 counties).
- Government-owned lands (Federal, State, County, Tax Forfeit, Tribal) derived layers.
- Note limitations (not all counties open; attribute completeness varies) and provide links back to county sources.

### I. Infrastructure & Utilities
- Utilities, telecommunications, critical infrastructure where publicly available (MnGeo topic pages + Commons).
- Schools, hospitals, emergency facilities.

### J. Niche / Creative / High-Interest Layers (Differentiators)
- Historical aerial imagery comparison (slider tool).
- Lake bathymetry / depth contours where available.
- Public land survey (PLS) sections / township-range.
- Emerald Ash Borer or other invasive detections.
- Walk-in access hunting sites.
- Scenic byways, points of interest, cultural sites.
- Future: solar potential, broadband coverage, election results, school district performance, etc.

### Primary Data Hubs to Query First
1. **Minnesota Geospatial Commons** (gisdata.mn.gov / gis.data.mn.gov) – CKAN API + direct downloads + many ArcGIS Feature Services. This is the single most important source.
2. MnGeo image services and web map services.
3. Minnesota DNR services and datasets.
4. US Census Bureau API.
5. Open-Meteo / NWS for weather.
6. MnDOT GIS portal and traffic data.
7. MPCA What’s in My Neighborhood.
8. Open Data Minneapolis (and other city portals).
9. Minnesota Crime Data Explorer (BCA).

Always respect licenses, rate limits, and attribution requirements. Prefer vector over heavy raster when possible. Cache aggressively.

---

## 5. Visual Design Direction

- **Basemap options**: Clean light, rich dark (preferred for drama), satellite/hybrid, and a custom “Minnesota” styled vector basemap emphasizing water and forests.
- **Layer styling**: Professional cartography. Use perceptual color scales (e.g., from ColorBrewer or custom Minnesota-inspired palettes). Support opacity and blend modes.
- **Motion**: Subtle fade-ins, animated traffic flow if feasible, pulsing highlights for selected features, smooth camera movements.
- **UI chrome**: Minimal, elegant, high-contrast controls that don’t fight the map. Floating or side panel with glassmorphism or soft shadows optional.
- **Branding**: “MapMinnesota” – clean wordmark, possible subtle northern landscape iconography. Professional yet inviting.

---

## 6. Key Features (MVP → V1)

### MVP
- Interactive map centered on Minnesota with zoom/pan.
- 8–12 high-quality toggleable layers across categories (basemap choices, roads, weather, hydrography, key demographics, one or two DNR layers, imagery).
- Layer panel with categories, toggles, opacity, legends.
- Feature identify / popup with key attributes.
- Search by place name / address.
- Shareable URL that restores view + layers.
- Mobile-responsive layout.
- Attribution footer.

### V1 Enhancements
- Richer demographic choropleths with time or variable selectors.
- Crime and environmental site layers with filtering.
- Parcel / ownership exploration (where data exists).
- Historical imagery compare tool.
- Bookmarks / saved views.
- Measurement tools.
- Export map image or simple report.
- Dark mode + multiple basemaps.
- Performance optimizations and progressive layer loading.

---

## 7. Architecture & Implementation Notes for Agent

1. Start by inventorying and testing the most important endpoints from Minnesota Geospatial Commons, MnGeo WMS/Image services, Census API, Open-Meteo, and DNR hydrography.
2. Design a flexible layer configuration system (JSON or code-based) that defines: name, category, source type (vector tile / GeoJSON / WMS / ArcGIS REST / custom), style, legend, popup template, attribution, default opacity/visibility.
3. Implement efficient data loading (bbox queries, tiling, clustering for dense points).
4. Build beautiful, consistent popup and side-panel components.
5. Ensure CORS handling and graceful degradation when a service is slow or unavailable.
6. Plan for future expansion: new layers should be addable with minimal code changes.
7. Include clear source attribution and “Data last updated” indicators where possible.
8. Accessibility and performance budgets from day one.

---

## 8. Non-Goals (Initial Scope)

- User accounts / personalization beyond local storage of preferences.
- Editing or contributing data.
- Heavy analysis tools (routing, advanced spatial queries) — keep focus on exploration and visualization.
- Commercial data layers that require paid licenses.

---

## 9. Deliverables Expected from Agent

- Working prototype / production-ready web application matching the vision.
- Clean, documented codebase.
- Layer configuration that is easy to extend.
- README with setup, data source notes, and attribution requirements.
- Basic deployment instructions.
- Suggestions for next high-value layers after MVP.

---

## 10. Inspiration & References

- Beautiful public map experiences (e.g., well-designed city open data maps, climate explorers, or nature atlases).
- Minnesota Geospatial Commons as the primary data backbone.
- MapLibre GL JS examples for advanced styling and interactions.
- High-quality cartographic examples that treat data visualization as design.

---

This document is intentionally detailed so an AI agent can begin architecture, data integration, visual design, and implementation with minimal ambiguity while still leaving room for creative excellence in the visual and interaction design.

**Next recommended step for the agent**: Audit the top data sources listed, prototype the map shell + layer system with 4–5 high-impact layers, and establish the visual language (basemap + UI).
