import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const attackFromAllSides = {
  cardId: 'attack-from-all-sides',
  name: 'Attack From All Sides',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'deal-three',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 3,
                  },
                },
              ],
            },
            {
              id: 'deal-five',
              condition: {
                kind: 'numeric-at-least',
                value: {
                  kind: 'unit-aspects',
                  filter: {
                    controller: 'friendly',
                  },
                },
                amount: 4,
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 5,
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
