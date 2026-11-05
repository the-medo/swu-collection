import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteVanquish = {
  cardId: 'vanquish',
  name: 'Vanquish',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 5,
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
            kind: 'defeat',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
