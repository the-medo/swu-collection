import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePrivateManufacturing = {
  cardId: 'private-manufacturing',
  name: 'Private Manufacturing',
  kind: 'event',
  aspects: [],
  traits: ['Supply'],
  cost: 2,
  effects: [
    {
      kind: 'draw-cards',
      amount: 2,
    },
    {
      kind: 'if',
      condition: {
        kind: 'units-at-most',
        filter: {
          controller: 'friendly',
          token: true,
        },
        amount: 0,
      },
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 2,
          max: 2,
          bind: 'card',
          effects: [
            {
              kind: 'bottom-hand',
              group: 'bottom',
            },
          ],
          group: 'bottom',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
