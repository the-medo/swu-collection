import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTakedown = {
  cardId: 'takedown',
  name: 'Takedown',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        remainingHpAtMost: 5,
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
