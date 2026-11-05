import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMakeAnOpening = {
  cardId: 'make-an-opening',
  name: 'Make an Opening',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: -2,
            hp: -2,
            duration: 'phase',
          },
        },
      ],
    },
    {
      kind: 'heal-own-base',
      amount: 2,
    },
  ],
} as const satisfies EventDefinition;
