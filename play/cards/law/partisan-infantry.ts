import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const partisanInfantry = {
  cardId: 'partisan-infantry',
  name: 'Partisan Infantry',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Rebel', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  raid: 1,
} as const satisfies UnitDefinition;
