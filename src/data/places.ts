import type { LngLat } from './geo';

// Reference places used by the mock generators and the search box.
// Coordinates are approximate; populations are rounded and illustrative.

export interface City {
  name: string;
  coord: LngLat;
  pop: number;
  tier: 1 | 2 | 3;
}

export const CITIES: City[] = [
  { name: 'Minneapolis', coord: [-93.265, 44.978], pop: 429000, tier: 1 },
  { name: 'Saint Paul', coord: [-93.094, 44.954], pop: 311000, tier: 1 },
  { name: 'Rochester', coord: [-92.466, 44.022], pop: 121000, tier: 1 },
  { name: 'Duluth', coord: [-92.1, 46.787], pop: 87000, tier: 1 },
  { name: 'Bloomington', coord: [-93.298, 44.841], pop: 89000, tier: 3 },
  { name: 'Brooklyn Park', coord: [-93.356, 45.094], pop: 86000, tier: 3 },
  { name: 'Plymouth', coord: [-93.455, 45.01], pop: 81000, tier: 3 },
  { name: 'Woodbury', coord: [-92.959, 44.924], pop: 75000, tier: 3 },
  { name: 'Maple Grove', coord: [-93.456, 45.073], pop: 70000, tier: 3 },
  { name: 'Blaine', coord: [-93.235, 45.161], pop: 70000, tier: 3 },
  { name: 'Lakeville', coord: [-93.242, 44.65], pop: 69000, tier: 3 },
  { name: 'Eagan', coord: [-93.166, 44.804], pop: 68000, tier: 3 },
  { name: 'Burnsville', coord: [-93.278, 44.768], pop: 64000, tier: 3 },
  { name: 'Eden Prairie', coord: [-93.471, 44.855], pop: 64000, tier: 3 },
  { name: 'Coon Rapids', coord: [-93.303, 45.12], pop: 63000, tier: 3 },
  { name: 'Stillwater', coord: [-92.806, 45.056], pop: 19000, tier: 3 },
  { name: 'St. Cloud', coord: [-94.163, 45.557], pop: 69000, tier: 2 },
  { name: 'Mankato', coord: [-93.999, 44.164], pop: 44000, tier: 2 },
  { name: 'Moorhead', coord: [-96.767, 46.874], pop: 44000, tier: 2 },
  { name: 'Winona', coord: [-91.639, 44.05], pop: 25000, tier: 2 },
  { name: 'Owatonna', coord: [-93.226, 44.084], pop: 26000, tier: 3 },
  { name: 'Austin', coord: [-92.975, 43.667], pop: 26000, tier: 3 },
  { name: 'Faribault', coord: [-93.269, 44.295], pop: 24000, tier: 3 },
  { name: 'Northfield', coord: [-93.161, 44.458], pop: 20000, tier: 3 },
  { name: 'Willmar', coord: [-95.043, 45.122], pop: 21000, tier: 2 },
  { name: 'Red Wing', coord: [-92.534, 44.563], pop: 16000, tier: 3 },
  { name: 'Albert Lea', coord: [-93.368, 43.648], pop: 18000, tier: 3 },
  { name: 'Brainerd', coord: [-94.201, 46.358], pop: 14000, tier: 2 },
  { name: 'Bemidji', coord: [-94.88, 47.474], pop: 15000, tier: 2 },
  { name: 'Hibbing', coord: [-92.937, 47.427], pop: 16000, tier: 3 },
  { name: 'Virginia', coord: [-92.537, 47.523], pop: 8500, tier: 3 },
  { name: 'Alexandria', coord: [-95.378, 45.885], pop: 14000, tier: 2 },
  { name: 'Fergus Falls', coord: [-96.076, 46.283], pop: 14000, tier: 3 },
  { name: 'Marshall', coord: [-95.788, 44.447], pop: 13000, tier: 2 },
  { name: 'Worthington', coord: [-95.596, 43.62], pop: 13000, tier: 3 },
  { name: 'New Ulm', coord: [-94.46, 44.312], pop: 14000, tier: 3 },
  { name: 'Hutchinson', coord: [-94.37, 44.888], pop: 14000, tier: 3 },
  { name: 'Little Falls', coord: [-94.362, 45.976], pop: 9000, tier: 3 },
  { name: 'Grand Rapids', coord: [-93.53, 47.237], pop: 11000, tier: 3 },
  { name: 'Thief River Falls', coord: [-96.181, 48.119], pop: 8700, tier: 3 },
  { name: 'Crookston', coord: [-96.608, 47.774], pop: 7500, tier: 3 },
  { name: 'Detroit Lakes', coord: [-95.845, 46.817], pop: 9900, tier: 3 },
  { name: 'Park Rapids', coord: [-95.059, 46.922], pop: 4200, tier: 3 },
  { name: 'International Falls', coord: [-93.41, 48.601], pop: 5800, tier: 2 },
  { name: 'Ely', coord: [-91.867, 47.903], pop: 3300, tier: 3 },
  { name: 'Two Harbors', coord: [-91.671, 47.023], pop: 3600, tier: 3 },
  { name: 'Grand Marais', coord: [-90.334, 47.75], pop: 1300, tier: 2 },
  { name: 'Roseau', coord: [-95.762, 48.846], pop: 2700, tier: 3 },
  { name: 'Warroad', coord: [-95.315, 48.905], pop: 1800, tier: 3 },
  { name: 'Pipestone', coord: [-96.317, 43.994], pop: 4200, tier: 3 },
];

export interface Park {
  name: string;
  coord: LngLat;
  kind: 'State Park' | 'State Recreation Area' | 'National Monument';
}

export const PARKS: Park[] = [
  { name: 'Itasca', coord: [-95.19, 47.2], kind: 'State Park' },
  { name: 'Gooseberry Falls', coord: [-91.47, 47.14], kind: 'State Park' },
  { name: 'Split Rock Lighthouse', coord: [-91.37, 47.2], kind: 'State Park' },
  { name: 'Tettegouche', coord: [-91.2, 47.34], kind: 'State Park' },
  { name: 'Temperance River', coord: [-90.87, 47.55], kind: 'State Park' },
  { name: 'Judge C.R. Magney', coord: [-90.05, 47.82], kind: 'State Park' },
  { name: 'Grand Portage', coord: [-89.59, 47.999], kind: 'State Park' },
  { name: 'Jay Cooke', coord: [-92.37, 46.65], kind: 'State Park' },
  { name: 'Banning', coord: [-92.86, 46.17], kind: 'State Park' },
  { name: 'St. Croix', coord: [-92.68, 45.95], kind: 'State Park' },
  { name: 'Interstate', coord: [-92.65, 45.4], kind: 'State Park' },
  { name: "William O'Brien", coord: [-92.76, 45.22], kind: 'State Park' },
  { name: 'Afton', coord: [-92.77, 44.85], kind: 'State Park' },
  { name: 'Fort Snelling', coord: [-93.18, 44.89], kind: 'State Park' },
  { name: 'Frontenac', coord: [-92.33, 44.52], kind: 'State Park' },
  { name: 'Whitewater', coord: [-92.05, 44.06], kind: 'State Park' },
  { name: 'Forestville / Mystery Cave', coord: [-92.22, 43.64], kind: 'State Park' },
  { name: 'Minneopa', coord: [-94.08, 44.15], kind: 'State Park' },
  { name: 'Blue Mounds', coord: [-96.19, 43.71], kind: 'State Park' },
  { name: 'Pipestone', coord: [-96.325, 44.013], kind: 'National Monument' },
  { name: 'Lac qui Parle', coord: [-95.92, 45.02], kind: 'State Park' },
  { name: 'Sibley', coord: [-95.03, 45.31], kind: 'State Park' },
  { name: 'Glacial Lakes', coord: [-95.53, 45.54], kind: 'State Park' },
  { name: 'Maplewood', coord: [-95.95, 46.53], kind: 'State Park' },
  { name: 'Buffalo River', coord: [-96.47, 46.87], kind: 'State Park' },
  { name: 'Charles A. Lindbergh', coord: [-94.39, 45.96], kind: 'State Park' },
  { name: 'Mille Lacs Kathio', coord: [-93.75, 46.13], kind: 'State Park' },
  { name: 'Cuyuna Country', coord: [-93.98, 46.47], kind: 'State Recreation Area' },
  { name: 'Lake Bemidji', coord: [-94.82, 47.53], kind: 'State Park' },
  { name: 'Bear Head Lake', coord: [-92.05, 47.79], kind: 'State Park' },
  { name: 'Lake Vermilion–Soudan Mine', coord: [-92.24, 47.82], kind: 'State Park' },
  { name: 'Zippel Bay', coord: [-94.85, 48.85], kind: 'State Park' },
];

export interface NamedLake {
  name: string;
  center: LngLat;
  rx: number; // degrees lon
  ry: number; // degrees lat
  rot: number;
}

export const NAMED_LAKES: NamedLake[] = [
  { name: 'Lower Red Lake', center: [-95.0, 48.0], rx: 0.38, ry: 0.13, rot: 0.1 },
  { name: 'Upper Red Lake', center: [-94.75, 48.15], rx: 0.3, ry: 0.1, rot: -0.15 },
  { name: 'Mille Lacs Lake', center: [-93.65, 46.24], rx: 0.2, ry: 0.13, rot: 0.3 },
  { name: 'Leech Lake', center: [-94.4, 47.15], rx: 0.2, ry: 0.11, rot: -0.6 },
  { name: 'Lake Winnibigoshish', center: [-94.2, 47.44], rx: 0.13, ry: 0.08, rot: 0.2 },
  { name: 'Lake Vermilion', center: [-92.35, 47.86], rx: 0.18, ry: 0.04, rot: 0.25 },
  { name: 'Rainy Lake', center: [-93.0, 48.6], rx: 0.25, ry: 0.05, rot: -0.1 },
  { name: 'Lake Minnetonka', center: [-93.6, 44.93], rx: 0.07, ry: 0.035, rot: 0.4 },
  { name: 'Cass Lake', center: [-94.55, 47.39], rx: 0.07, ry: 0.05, rot: 0 },
  { name: 'Gull Lake', center: [-94.36, 46.43], rx: 0.03, ry: 0.07, rot: 0.2 },
  { name: 'Lake Pepin', center: [-92.25, 44.48], rx: 0.13, ry: 0.025, rot: -0.55 },
  { name: 'Otter Tail Lake', center: [-95.6, 46.42], rx: 0.07, ry: 0.035, rot: 0.3 },
];

export interface Tour {
  name: string;
  center: LngLat;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export const TOURS: Tour[] = [
  { name: 'Whole state', center: [-94.3, 46.35], zoom: 5.6 },
  { name: 'Twin Cities', center: [-93.2, 44.96], zoom: 9.6, pitch: 45, bearing: -12 },
  { name: 'North Shore', center: [-91.2, 47.35], zoom: 8, pitch: 50, bearing: 38 },
  { name: 'Boundary Waters', center: [-91.4, 47.95], zoom: 7.8, pitch: 30 },
  { name: 'Lake Country', center: [-94.6, 46.9], zoom: 7.4, pitch: 35, bearing: -20 },
  { name: 'Driftless', center: [-91.9, 44.0], zoom: 8.2, pitch: 45, bearing: 20 },
];
