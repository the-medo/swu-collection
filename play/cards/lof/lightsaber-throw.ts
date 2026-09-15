import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const lightsaberThrow = {
  cardId: 'lightsaber-throw',
  name: 'Lightsaber Throw',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'pay',
      costs: [
        {
          kind: 'discard-hand',
          count: 1,
          filter: {
            trait: 'Lightsaber',
          },
        },
      ],
      optional: false,
      effects: [
        {
          kind: 'damage-unit',
          amount: 4,
          arena: 'ground',
          optional: false,
        },
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
