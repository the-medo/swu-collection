import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGrievousReassembly = {
  cardId: 'grievous-reassembly',
  name: 'Grievous Reassembly',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Supply'],
  cost: 2,
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
            amount: 3,
          },
        },
      ],
    },
    {
      kind: 'create-unit',
      cardId: 'battle-droid',
      count: 1,
    },
  ],
} as const satisfies EventDefinition;
