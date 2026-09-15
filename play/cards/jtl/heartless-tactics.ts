import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const heartlessTactics = {
  cardId: 'heartless-tactics',
  name: 'Heartless Tactics',
  kind: 'event',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'exhaust',
          },
        },
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: -2,
            hp: 0,
            duration: 'phase',
          },
        },
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'chosen',
            filter: {
              nonLeader: true,
              powerEquals: 0,
            },
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                sameAs: 'chosen',
              },
              bind: 'returned',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'returned',
                  operation: {
                    kind: 'return-to-hand',
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
