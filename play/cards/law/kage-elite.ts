import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const kageElite = {
  cardId: 'kage-elite',
  name: 'Kage Elite',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe'],
  cost: 3,
  power: 2,
  hp: 3,
  arena: 'ground',
  raid: 2,
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;
