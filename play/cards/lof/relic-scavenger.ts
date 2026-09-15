import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const relicScavenger = {
  cardId: 'relic-scavenger',
  name: 'Relic Scavenger',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Fringe'],
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'ground',
  restore: 2,
} as const satisfies UnitDefinition;
