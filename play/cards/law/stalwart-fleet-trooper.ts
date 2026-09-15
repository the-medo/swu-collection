import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const stalwartFleetTrooper = {
  cardId: 'stalwart-fleet-trooper',
  name: 'Stalwart Fleet Trooper',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
