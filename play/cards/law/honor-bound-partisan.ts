import type { UnitDefinition } from '../definition.ts';

// LAW 058. Printed text is pinned in meta-play-costs fixture.
export const honorBoundPartisan = {
  cardId: 'honor-bound-partisan',
  name: 'Honor-Bound Partisan',
  kind: 'unit',
  aspects: ['Command', 'Aggression'],
  traits: ['Rebel', "Twi'lek"],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-base',
          amount: 1,
        },
      ],
    },
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'next-play',
          filter: {
            kind: 'unit',
          },
          discount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
