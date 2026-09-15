import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const disturbanceInTheForce = {
  cardId: 'disturbance-in-the-force',
  name: 'Disturbance in the Force',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Force'],
  cost: 1,
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'unit-history-at-least',
        event: 'left',
        player: 'self',
        amount: 1,
      },
      effects: [
        {
          kind: 'gain-force',
        },
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
