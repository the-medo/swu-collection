import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const knightOfRen = {
  cardId: 'knight-of-ren',
  name: 'Knight of Ren',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['First Order'],
  cost: 3,
  power: 4,
  hp: 4,
  arena: 'ground',
} as const satisfies UnitDefinition;
