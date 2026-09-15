import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const relentlessHunters = {
  cardId: 'relentless-hunters',
  name: 'Relentless Hunters',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Bounty Hunter'],
  cost: 4,
  power: 5,
  hp: 4,
  arena: 'ground',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;
