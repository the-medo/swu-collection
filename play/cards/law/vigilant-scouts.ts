import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const vigilantScouts = {
  cardId: 'vigilant-scouts',
  name: 'Vigilant Scouts',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  restore: 2,
} as const satisfies UnitDefinition;
