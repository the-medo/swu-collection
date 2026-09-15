import type { UnitDefinition } from '../definition.ts';

// LAW . V8 rules; printed text pinned in meta combat fixture.
export const bithBrute = {
  cardId: 'bith-brute',
  name: 'Bith Brute',
  kind: 'unit',
  aspects: ['Vigilance', 'Aggression'],
  traits: ['Underworld'],
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'ground',
  keywords: ['Sentinel', 'Saboteur'],
} as const satisfies UnitDefinition;
