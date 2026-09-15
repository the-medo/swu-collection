import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const mysteriousHermit = {
  cardId: 'mysterious-hermit',
  name: 'Mysterious Hermit',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Force', 'Fringe'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;
