import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCovertStrength = {
  cardId: 'covert-strength',
  name: 'Covert Strength',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 1,
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
            kind: 'heal',
            amount: 2,
          },
        },
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: 1,
          },
        },
      ],
    },
  ],
  smuggle: [
    {
      id: 'smuggle',
      cost: 3,
      aspects: ['Vigilance'],
    },
  ],
} as const satisfies EventDefinition;
