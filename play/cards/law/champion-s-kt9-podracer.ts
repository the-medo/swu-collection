import type { UnitDefinition } from '../definition.ts';

// Credit creation follows v8 §3.7.13.
export const championSKt9Podracer = {
  cardId: 'champion-s-kt9-podracer',
  name: "Champion's KT9 Podracer",
  aspects: ['Cunning'],
  traits: ['Vehicle', 'Speeder'],
  cost: 3,
  power: 2,
  hp: 3,
  kind: 'unit',
  arena: 'ground',
  triggers: [
    {
      id: 'create-credit',
      timing: 'played',
      effects: [
        {
          kind: 'create-credits',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
