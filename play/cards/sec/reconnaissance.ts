import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const reconnaissance = {
  cardId: 'reconnaissance',
  name: 'Reconnaissance',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Plan'],
  cost: 2,
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'all',
        conditions: [
          {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              arena: 'ground',
            },
            amount: 1,
          },
          {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              arena: 'space',
            },
            amount: 1,
          },
        ],
      },
      effects: [
        {
          kind: 'draw-cards',
          amount: 2,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
