import type { UnitDefinition } from '../definition.ts';

// LAW . V8 rules; printed text pinned in meta combat fixture.
export const benthicTwoTubesTheWarHasJustBegun = {
  cardId: 'benthic--two-tubes---the-war-has-just-begun',
  name: 'Benthic \u201cTwo Tubes\u201d, The War Has Just Begun',
  kind: 'unit',
  aspects: ['Command', 'Aggression'],
  traits: ['Underworld', 'Trooper'],
  unique: true,
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'damage-unit',
          amount: 1,
          arena: 'ground',
          optional: false,
          controller: 'enemy',
        },
      ],
    },
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'damage-base',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
