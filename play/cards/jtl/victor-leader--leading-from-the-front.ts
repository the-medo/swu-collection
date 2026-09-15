import type { UnitDefinition } from '../definition.ts';

// JTL 085. Printed text is pinned in meta-continuous fixture.
export const victorLeaderLeadingFromTheFront = {
  cardId: 'victor-leader--leading-from-the-front',
  name: 'Victor Leader, Leading from the Front',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 3,
  unique: true,
  power: 2,
  hp: 4,
  arena: 'space',
  auras: [
    {
      id: 'fleet-support',
      filter: {
        controller: 'friendly',
        arena: 'space',
        otherThan: 'source',
      },
      power: 1,
      hp: 1,
    },
  ],
} as const satisfies UnitDefinition;
