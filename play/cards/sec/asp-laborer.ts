import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const aspLaborer = {
  cardId: 'asp-laborer',
  name: 'ASP Laborer',
  kind: 'unit',
  aspects: [],
  traits: ['Droid'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  restore: 1,
} as const satisfies UnitDefinition;
