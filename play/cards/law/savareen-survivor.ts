import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const savareenSurvivor = {
  cardId: 'savareen-survivor',
  name: 'Savareen Survivor',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Fringe'],
  cost: 1,
  power: 2,
  hp: 1,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;
