import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetCloudCityWingGuard = {
  cardId: 'cloud-city-wing-guard',
  name: 'Cloud City Wing Guard',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe', 'Trooper'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
