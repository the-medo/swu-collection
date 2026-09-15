import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const followMe = {
  cardId: 'follow-me',
  name: 'Follow Me',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      forAttack: {},
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          after: [
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
                    kind: 'give-token',
                    token: 'advantage',
                    count: 3,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
