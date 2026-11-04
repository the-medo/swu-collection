import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetJawaScavenger = {
  cardId: 'jawa-scavenger',
  name: 'Jawa Scavenger',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe', 'Jawa'],
  cost: 1,
  power: 2,
  hp: 1,
  arena: 'ground',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;
