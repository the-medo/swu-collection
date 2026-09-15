import type { UnitDefinition } from '../definition.ts';

// SEC 171. Printed text is pinned in meta-continuous fixture.
export const punishingOneTakesNoPrisoners = {
  cardId: 'punishing-one--takes-no-prisoners',
  name: 'Punishing One, Takes No Prisoners',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 5,
  unique: true,
  power: 3,
  hp: 5,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'always',
      },
      raid: {
        kind: 'unit-count',
        filter: {
          controller: 'enemy',
          damaged: true,
        },
      },
    },
  ],
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-unit',
          amount: 1,
          arena: 'any',
          optional: true,
        },
      ],
    },
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'damage-unit',
          amount: 1,
          arena: 'any',
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
