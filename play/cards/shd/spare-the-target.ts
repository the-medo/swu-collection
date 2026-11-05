import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSpareTheTarget = {
  cardId: 'spare-the-target',
  name: 'Spare the Target',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
        nonLeader: true,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'collect-bounties',
          target: 'chosen',
        },
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
