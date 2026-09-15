import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const undercoverOperation = {
  cardId: 'undercover-operation',
  name: 'Undercover Operation',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        playedThisPhase: true,
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'ready',
          },
        },
        {
          kind: 'if',
          condition: {
            kind: 'card-matches',
            target: 'chosen',
            filter: {
              maxCost: 3,
            },
          },
          effects: [
            {
              kind: 'create-unit',
              cardId: 'spy',
              count: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
