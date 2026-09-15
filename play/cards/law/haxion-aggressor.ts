import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const haxionAggressor = {
  cardId: 'haxion-aggressor',
  name: 'Haxion Aggressor',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  raid: 2,
} as const satisfies UnitDefinition;
