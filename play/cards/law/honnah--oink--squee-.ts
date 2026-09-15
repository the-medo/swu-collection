import type { UnitDefinition } from '../definition.ts';

// LAW 50. Printed text is pinned in the meta foundation fixture.
export const honnahOinkSquee = {
  cardId: 'honnah--oink--squee-',
  name: 'Honnah, OINK! SQUEE!',
  kind: 'unit',
  aspects: ['Vigilance', 'Aggression'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  raid: 2,
  restore: 2,
} as const satisfies UnitDefinition;
