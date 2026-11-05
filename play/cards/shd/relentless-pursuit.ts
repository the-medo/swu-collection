import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRelentlessPursuit = {
  cardId: 'relentless-pursuit',
  name: 'Relentless Pursuit',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'guard',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            maxCost: {
              kind: 'card-cost',
              target: 'guard',
            },
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'capture-unit',
              guard: 'guard',
              target: 'chosen',
            },
          ],
        },
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'guard',
            filter: {
              trait: 'Bounty Hunter',
            },
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'guard',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
