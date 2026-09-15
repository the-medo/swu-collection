import type { EventDefinition } from '../definition.ts';

// SEC 180. Printed text is pinned in meta-board fixture.
export const letSCallItWar = {
  cardId: 'let-s-call-it-war',
  name: "Let's Call It War",
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      bind: 'first',
      filter: {},
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'first',
          operation: {
            kind: 'damage',
            amount: 3,
          },
        },
        {
          kind: 'if',
          condition: {
            kind: 'initiative',
          },
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {
                sameArenaAs: 'first',
                otherThan: 'first',
              },
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 2,
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
