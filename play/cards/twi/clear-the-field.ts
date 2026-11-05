import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteClearTheField = {
  cardId: 'clear-the-field',
  name: 'Clear the Field',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        nonLeader: true,
        maxCost: 3,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'return-nonleader-units',
          filter: {
            nonLeader: true,
            anyOf: [
              {
                sameAs: 'chosen',
              },
              {
                controller: 'enemy',
                sameNameAs: 'chosen',
              },
            ],
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
