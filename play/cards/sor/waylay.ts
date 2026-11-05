import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteWaylay = {
  cardId: 'waylay',
  name: 'Waylay',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Trick'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        nonLeader: true,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'return-to-hand',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
