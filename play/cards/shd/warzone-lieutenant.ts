import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetWarzoneLieutenant = {
  cardId: 'warzone-lieutenant',
  name: 'Warzone Lieutenant',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Trooper'],
  cost: 1,
  power: 2,
  hp: 2,
  arena: 'ground',
} as const satisfies UnitDefinition;
