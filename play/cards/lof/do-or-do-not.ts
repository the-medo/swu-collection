import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const doOrDoNot = {
  cardId: 'do-or-do-not',
  name: 'Do or Do Not',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Force'],
  cost: 2,
  effects: [
    {
      kind: 'pay',
      costs: [
        {
          kind: 'force',
        },
      ],
      optional: true,
      effects: [
        {
          kind: 'draw-cards',
          amount: 2,
        },
      ],
      otherwise: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
