export type BattlefieldShape =
  | 'planet'
  | 'asteroid'
  | 'station'
  | 'outpost'
  | 'death-star'
  | 'tie'
  | 'x-wing'
  | 'interceptor'
  | 'corvette'
  | 'executor'
  | 'destroyer'
  | 'home-one'
  | 'vulture'
  | 'providence'
  | 'lucrehulk'
  | 'venator'
  | 'hammerhead'
  | 'liberty'
  | 'nebulon-b'
  | 'mc75'
  | 'mc85'
  | 'raider'
  | 'light-cruiser'
  | 'resurgent'
  | 'subjugator'
  | 'city'
  | 'ion-cannon'
  | 'mining-facility';
export type BattlefieldCategory =
  | 'Planets'
  | 'Asteroids'
  | 'Stations'
  | 'Ships'
  | 'Backgrounds'
  | 'Colors'
  | 'Add-ons';
export type BattlefieldItem = {
  id: string;
  name: string;
  description: string;
  kind: 'object' | 'background' | 'color';
  category: BattlefieldCategory;
  cost: number;
  shape?: BattlefieldShape;
  width?: number;
  height?: number;
  // Tight drawing bounds make a model's width its visible length, not padding.
  artBounds?: { x: number; y: number; width: number; height: number };
  color?: string;
  accentColor?: string;
  shades?: [string, string, string];
};

// Hull dimensions stay proportional in thumbnails, editor placements, and profiles.
const capitalShip = (
  ship: Omit<BattlefieldItem, 'kind' | 'category' | 'height'> & {
    width: number;
    artBounds: NonNullable<BattlefieldItem['artBounds']>;
  },
): BattlefieldItem => ({
  ...ship,
  kind: 'object',
  category: 'Ships',
  height: (ship.width * ship.artBounds.height) / ship.artBounds.width,
});

export const battlefieldCatalog: BattlefieldItem[] = [
  {
    id: 'planet',
    name: 'Planet',
    description: 'Choose a rocky, ocean, desert, ice, or gas surface and its color.',
    kind: 'object',
    category: 'Planets',
    cost: 1000,
    shape: 'planet',
    width: 240,
    height: 240,
    artBounds: { x: -50, y: -50, width: 100, height: 100 },
    color: '#8ca2a3',
  },
  {
    id: 'asteroid-rock',
    name: 'Rocky asteroid',
    description: 'A cratered fragment ready for a mining outpost.',
    kind: 'object',
    category: 'Asteroids',
    cost: 300,
    shape: 'asteroid',
    width: 80,
    height: 65,
    color: '#8b8580',
  },
  {
    id: 'asteroid-large',
    name: 'Large asteroid',
    description: 'A rugged home for a remote facility.',
    kind: 'object',
    category: 'Asteroids',
    cost: 600,
    shape: 'asteroid',
    width: 135,
    height: 100,
    color: '#74695c',
  },
  {
    id: 'station-orbital',
    name: 'Orbital station',
    description: 'A circular hub for fleets and traders.',
    kind: 'object',
    category: 'Stations',
    cost: 2500,
    shape: 'station',
    width: 140,
    height: 140,
    color: '#a1b2c0',
  },
  {
    id: 'station-outpost',
    name: 'Deep-space outpost',
    description: 'A dock with solar arrays and a signal beacon.',
    kind: 'object',
    category: 'Stations',
    cost: 1800,
    shape: 'outpost',
    width: 160,
    height: 85,
    color: '#92a0b4',
  },
  {
    id: 'station-death-star',
    name: 'Death Star',
    description:
      'A planet-sized Imperial battle station. Scale up to 300%; cost grows to 400,000 credits.',
    kind: 'object',
    category: 'Stations',
    cost: 200000,
    shape: 'death-star',
    width: 240,
    height: 240,
    artBounds: { x: -50, y: -50, width: 100, height: 100 },
    color: '#a8b4bd',
  },
  {
    id: 'ship-tie',
    name: 'TIE fighter',
    description: 'Twin solar panels flank a compact cockpit.',
    kind: 'object',
    category: 'Ships',
    cost: 250,
    shape: 'tie',
    width: (8.99 / 13.4) * 20,
    height: ((8.99 / 13.4) * 20 * 84) / 96,
    artBounds: { x: -48, y: -42, width: 96, height: 84 },
    color: '#acb7c2',
  },
  {
    id: 'ship-x-wing',
    name: 'X-wing',
    description: 'Four wings, four engines, one mission.',
    kind: 'object',
    category: 'Ships',
    cost: 400,
    shape: 'x-wing',
    width: 20,
    height: (20 * 90) / 96,
    artBounds: { x: -44, y: -45, width: 96, height: 90 },
    color: '#d8d9d3',
  },
  {
    id: 'ship-interceptor',
    name: 'TIE interceptor',
    description: 'An angular, fast-moving Imperial fighter.',
    kind: 'object',
    category: 'Ships',
    cost: 300,
    shape: 'interceptor',
    width: (9.6 / 13.4) * 20,
    height: ((9.6 / 13.4) * 20 * 84) / 100,
    artBounds: { x: -43, y: -42, width: 100, height: 84 },
    color: '#97a7b7',
  },
  {
    id: 'ship-corvette',
    name: 'CR90 corvette',
    description: 'A nimble escort with a bank of bright engines.',
    kind: 'object',
    category: 'Ships',
    cost: 2000,
    shape: 'corvette',
    width: 40,
    height: (40 * 54) / 110,
    artBounds: { x: -53, y: -27, width: 110, height: 54 },
    color: '#d1c7b6',
  },
  {
    id: 'ship-chimaera',
    name: 'Chimaera',
    description: 'An Imperial Star Destroyer with a tiered command deck.',
    kind: 'object',
    category: 'Ships',
    cost: 12000,
    shape: 'destroyer',
    width: 1600 / 15,
    height: ((1600 / 15) * 68) / 109,
    artBounds: { x: -53, y: -34, width: 109, height: 68 },
    color: '#a5b8cc',
  },
  {
    id: 'ship-home-one',
    name: 'Home One',
    description: 'A Mon Calamari command cruiser with a rounded hull.',
    kind: 'object',
    category: 'Ships',
    cost: 8000,
    shape: 'home-one',
    width: 1200 / 15,
    height: (80 * 51.38) / 109.595,
    artBounds: { x: -55, y: -25.69, width: 109.595, height: 51.38 },
    color: '#c5b5a3',
  },
  {
    id: 'ship-executor',
    name: 'Executor',
    description: 'A sweeping Super Star Destroyer to anchor your fleet.',
    kind: 'object',
    category: 'Ships',
    cost: 70000,
    shape: 'executor',
    width: 400,
    height: 130,
    artBounds: { x: -60, y: -19.5, width: 120, height: 39 },
    color: '#8d9ba8',
  },
  {
    id: 'ship-vulture',
    name: 'Vulture droid',
    description: 'A small Separatist droid starfighter with swept twin wings.',
    kind: 'object',
    category: 'Ships',
    cost: 200,
    shape: 'vulture',
    width: 10,
    height: (10 * 68) / 107,
    artBounds: { x: -53, y: -34, width: 107, height: 68 },
    color: '#9badb6',
  },
  {
    id: 'ship-invincible',
    name: 'Invincible',
    description: 'A Separatist Providence dreadnought with a long armored hull.',
    kind: 'object',
    category: 'Ships',
    cost: 16000,
    shape: 'providence',
    width: 2177.35 / 15,
    height: ((2177.35 / 15) * 48) / 113.05,
    artBounds: { x: -56, y: -24, width: 113.05, height: 48 },
    color: '#a6b6bc',
  },
  {
    id: 'ship-vuutun-palaa',
    name: 'Vuutun Palaa',
    description: 'A Lucrehulk droid control ship with a horseshoe hull for your Separatist fleet.',
    kind: 'object',
    category: 'Ships',
    cost: 24000,
    shape: 'lucrehulk',
    width: 3356.9 / 15,
    height: ((3356.9 / 15) * 106) / 109,
    artBounds: { x: -53, y: -53, width: 109, height: 106 },
    color: '#a6b3bc',
  },
  // Named capital ships discovered in the card catalog. Large hulls use 15 m/px;
  // escorts retain the readable perspective scale used by the 40 px CR90.
  capitalShip({
    id: 'ship-tantive-iv',
    name: 'Tantive IV',
    description: 'Rebel CR90 corvette with diplomatic red striping and a bank of bright engines.',
    cost: 2000,
    shape: 'corvette',
    width: 40,
    artBounds: { x: -53, y: -27, width: 110, height: 54 },
    color: '#e0dad0',
    accentColor: '#a3463c',
  }),
  capitalShip({
    id: 'ship-lightmaker',
    name: 'Lightmaker',
    description: 'A Rebel Hammerhead corvette with a reinforced bow and four engine pods.',
    cost: 1800,
    shape: 'hammerhead',
    width: 35,
    artBounds: { x: -60, y: -21, width: 120, height: 42 },
    color: '#cdbda2',
    accentColor: '#a86b36',
  }),
  capitalShip({
    id: 'ship-liberty',
    name: 'Liberty',
    description: 'A Rebel MC80 Liberty cruiser with swept wings and an organic armored hull.',
    cost: 8000,
    shape: 'liberty',
    width: 1200 / 15,
    artBounds: { x: -60, y: -30, width: 120, height: 60 },
    color: '#c7bdaa',
    accentColor: '#97785b',
  }),
  capitalShip({
    id: 'ship-redemption',
    name: 'Redemption',
    description: 'A Rebel Nebulon-B medical frigate: two armored sections joined by a narrow spar.',
    cost: 3000,
    shape: 'nebulon-b',
    width: 50,
    artBounds: { x: -60, y: -20, width: 120, height: 40 },
    color: '#c3c9c8',
    accentColor: '#8e4841',
  }),
  capitalShip({
    id: 'ship-profundity',
    name: 'Profundity',
    description: 'A Rebel MC75 flagship with a bulbous bow and a densely plated hull.',
    cost: 8000,
    shape: 'mc75',
    width: 1204.44 / 15,
    artBounds: { x: -60, y: -23, width: 120, height: 46 },
    color: '#b9b9af',
    accentColor: '#927657',
  }),
  capitalShip({
    id: 'ship-resolute',
    name: 'Resolute',
    description: 'Anakin’s Republic Venator, with red hangar doors and twin command bridges.',
    cost: 10000,
    shape: 'venator',
    width: 1155 / 15,
    artBounds: { x: -60, y: -30, width: 120, height: 60 },
    color: '#bfc6cb',
    accentColor: '#a7463c',
  }),
  capitalShip({
    id: 'ship-tranquility',
    name: 'Tranquility',
    description: 'A Republic Venator with a red flight deck and pale armored wings.',
    cost: 10000,
    shape: 'venator',
    width: 1155 / 15,
    artBounds: { x: -60, y: -30, width: 120, height: 60 },
    color: '#d5d4cb',
    accentColor: '#934b45',
  }),
  capitalShip({
    id: 'ship-raddus',
    name: 'Raddus',
    description: 'A Resistance MC85 star cruiser with a long flowing hull and broad stern.',
    cost: 26000,
    shape: 'mc85',
    width: 3438.41 / 15,
    artBounds: { x: -60, y: -27, width: 120, height: 54 },
    color: '#c1c7c3',
    accentColor: '#75999e',
  }),
  capitalShip({
    id: 'ship-avenger',
    name: 'Avenger',
    description: 'An Imperial Star Destroyer with a dagger hull and heavy turbolaser batteries.',
    cost: 12000,
    shape: 'destroyer',
    width: 1600 / 15,
    artBounds: { x: -53, y: -34, width: 109, height: 68 },
    color: '#bac4cb',
    accentColor: '#718692',
  }),
  capitalShip({
    id: 'ship-devastator',
    name: 'Devastator',
    description: 'Darth Vader’s Imperial Star Destroyer, finished in cold gray armor.',
    cost: 12000,
    shape: 'destroyer',
    width: 1600 / 15,
    artBounds: { x: -53, y: -34, width: 109, height: 68 },
    color: '#99a5af',
    accentColor: '#495c6b',
  }),
  capitalShip({
    id: 'ship-relentless',
    name: 'Relentless',
    description: 'An Imperial Star Destroyer with layered armor and a raised command deck.',
    cost: 12000,
    shape: 'destroyer',
    width: 1600 / 15,
    artBounds: { x: -53, y: -34, width: 109, height: 68 },
    color: '#b1b7b8',
    accentColor: '#6b787c',
  }),
  capitalShip({
    id: 'ship-corvus',
    name: 'Corvus',
    description: 'Inferno Squad’s Imperial Raider II corvette, with angular solar fins.',
    cost: 2000,
    shape: 'raider',
    width: 40,
    artBounds: { x: -60, y: -30, width: 120, height: 60 },
    color: '#727e89',
    accentColor: '#a5433e',
  }),
  capitalShip({
    id: 'ship-gideons-light-cruiser',
    name: 'Gideon’s Light Cruiser',
    description: 'An Imperial light cruiser with a forked bow and three engine nacelles.',
    cost: 5000,
    shape: 'light-cruiser',
    width: 60,
    artBounds: { x: -60, y: -23, width: 120, height: 46 },
    color: '#a7b3be',
    accentColor: '#687b8b',
  }),
  capitalShip({
    id: 'ship-finalizer',
    name: 'Finalizer',
    description:
      'A First Order Resurgent Star Destroyer with a split prow and massive layered hull.',
    cost: 22000,
    shape: 'resurgent',
    width: 2915.81 / 15,
    artBounds: { x: -60, y: -32, width: 120, height: 64 },
    color: '#8997a5',
    accentColor: '#4b6577',
  }),
  capitalShip({
    id: 'ship-invisible-hand',
    name: 'The Invisible Hand',
    description:
      'Grievous’s Separatist Providence carrier, smaller than the Invincible dreadnought.',
    cost: 7500,
    shape: 'providence',
    width: 1088 / 15,
    artBounds: { x: -56, y: -24, width: 113.05, height: 48 },
    color: '#c2c1b3',
    accentColor: '#91854d',
  }),
  capitalShip({
    id: 'ship-malevolence',
    name: 'Malevolence',
    description: 'A Separatist Subjugator heavy cruiser with immense side-mounted ion cannons.',
    cost: 48000,
    shape: 'subjugator',
    width: 4845 / 15,
    artBounds: { x: -60, y: -26, width: 120, height: 52 },
    color: '#8499a6',
    accentColor: '#3f688a',
  }),
  {
    id: 'background-default',
    name: 'Distant orbit',
    description: 'The original teal glow. Always available.',
    kind: 'background',
    category: 'Backgrounds',
    cost: 0,
    shades: ['#0a141e', '#263f50', '#5d7981'],
  },
  {
    id: 'background-nebula',
    name: 'Violet nebula',
    description: 'A soft wash of violet and magenta.',
    kind: 'background',
    category: 'Backgrounds',
    cost: 700,
    shades: ['#100d23', '#3b245b', '#9b628d'],
  },
  {
    id: 'background-ember',
    name: 'Ember horizon',
    description: 'Amber starlight across a deep red sky.',
    kind: 'background',
    category: 'Backgrounds',
    cost: 700,
    shades: ['#190e16', '#57322b', '#ac7752'],
  },
  {
    id: 'background-midnight',
    name: 'Deep space',
    description: 'A clear, dark canvas for a bright fleet.',
    kind: 'background',
    category: 'Backgrounds',
    cost: 500,
    shades: ['#030815', '#101e39', '#284671'],
  },
  {
    id: 'background-emerald',
    name: 'Emerald veil',
    description: 'A green glow from a distant nebula.',
    kind: 'background',
    category: 'Backgrounds',
    cost: 700,
    shades: ['#071613', '#174238', '#5b9380'],
  },
  {
    id: 'color-default',
    name: 'Original colors',
    description: 'Each object’s original finish. Always available.',
    kind: 'color',
    category: 'Colors',
    cost: 0,
  },
  {
    id: 'color-crimson',
    name: 'Crimson',
    description: 'A red finish for your planets, ships, and stations.',
    kind: 'color',
    category: 'Colors',
    cost: 400,
    color: '#d37378',
  },
  {
    id: 'color-gold',
    name: 'Starlight gold',
    description: 'A warm golden finish.',
    kind: 'color',
    category: 'Colors',
    cost: 400,
    color: '#dfbd73',
  },
  {
    id: 'color-blue',
    name: 'Ion blue',
    description: 'A bright blue finish.',
    kind: 'color',
    category: 'Colors',
    cost: 400,
    color: '#70b8e8',
  },
  {
    id: 'color-violet',
    name: 'Nebula violet',
    description: 'A lavender finish.',
    kind: 'color',
    category: 'Colors',
    cost: 400,
    color: '#b090d8',
  },
  {
    id: 'color-green',
    name: 'Verdant',
    description: 'A green finish for an inhabited world.',
    kind: 'color',
    category: 'Colors',
    cost: 400,
    color: '#7fbd9b',
  },
  {
    id: 'addon-mining',
    name: 'Mining facility',
    description: 'A compact mining outpost. Place it anywhere on your Battlefield.',
    kind: 'object',
    category: 'Add-ons',
    cost: 900,
    shape: 'mining-facility',
    width: 24,
    height: 24,
    color: '#a4b1be',
  },
  {
    id: 'addon-city',
    name: 'Planetary city',
    description: 'A tiny cluster of buildings and streets. Place as many as you like.',
    kind: 'object',
    category: 'Add-ons',
    cost: 1200,
    shape: 'city',
    width: 18,
    height: 18,
    color: '#b0bcc3',
  },
  {
    id: 'addon-ion',
    name: 'Ion cannon',
    description: 'A small circular defense emplacement with a short barrel.',
    kind: 'object',
    category: 'Add-ons',
    cost: 1000,
    shape: 'ion-cannon',
    width: 14,
    height: 9.8,
    color: '#c4d1d5',
  },
];

export const canScaleBattlefieldItem = (item: BattlefieldItem) => item.kind === 'object';

export const battlefieldShipBatchLimit = 50;
export const canBatchBattlefieldItem = (item: BattlefieldItem) =>
  item.kind === 'object' && item.category === 'Ships' && (item.width ?? Infinity) <= 40;

export const battlefieldMaximumObjectScale = 3;
export const battlefieldDeathStarMaximumCost = 400000;

export const battlefieldItemMaxScale = (item: BattlefieldItem) =>
  item.category === 'Ships' ? 1 : battlefieldMaximumObjectScale;

export const hasBattlefieldAreaPricing = (item: BattlefieldItem) =>
  item.kind === 'object' &&
  (item.category === 'Planets' || item.category === 'Asteroids' || item.shape === 'death-star');

export const battlefieldItems = Object.assign(
  Object.create(null),
  Object.fromEntries(battlefieldCatalog.map(item => [item.id, item])),
) as Record<string, BattlefieldItem | undefined>;
export const battlefieldCategories: BattlefieldCategory[] = [
  'Planets',
  'Asteroids',
  'Stations',
  'Ships',
  'Backgrounds',
  'Colors',
  'Add-ons',
];
