import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const jediLightCruiser = {
  cardId: 'jedi-light-cruiser',
  name: 'Jedi Light Cruiser',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Jedi', 'Republic', 'Vehicle', 'Capital Ship'],
  cost: 6,
  power: 6,
  hp: 7,
  arena: 'space',
} as const satisfies UnitDefinition;
