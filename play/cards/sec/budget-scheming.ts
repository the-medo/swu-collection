import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const budgetScheming = {
  cardId: 'budget-scheming',
  name: 'Budget Scheming',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Law'],
  cost: 2,
  effects: [
    {
      kind: 'select-units',
      filter: {
        trait: 'Official',
      },
      bind: 'targets',
      max: 3,
      effects: [
        {
          kind: 'each-unit',
          filter: {
            inGroup: 'targets',
          },
          bind: 'chosen',
          effects: [
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
    },
  ],
} as const satisfies EventDefinition;
