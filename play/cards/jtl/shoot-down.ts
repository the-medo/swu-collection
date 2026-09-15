import type { EventDefinition } from '../definition.ts';

// JTL 176. Printed text is pinned in meta-board fixture.
export const shootDown = {
  cardId: 'shoot-down',
  name: 'Shoot Down',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      bind: 'chosen',
      filter: {
        arena: 'space',
      },
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'damage',
            amount: 3,
          },
        },
        {
          kind: 'if',
          condition: {
            kind: 'unit-defeated',
            target: 'chosen',
          },
          effects: [
            {
              kind: 'select-target',
              bases: 'any',
              bind: 'damage-target',
              optional: true,
              effects: [
                {
                  kind: 'damage-target',
                  target: 'damage-target',
                  amount: 2,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
