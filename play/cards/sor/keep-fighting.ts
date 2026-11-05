import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKeepFighting = {
  cardId: 'keep-fighting',
  name: 'Keep Fighting',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        powerAtMost: 3,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'ready',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
