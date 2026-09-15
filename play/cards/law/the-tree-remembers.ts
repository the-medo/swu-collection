import type { EventDefinition } from '../definition.ts';

// LAW . Printed text is pinned in the meta effects fixture.
export const theTreeRemembers = {
  cardId: 'the-tree-remembers',
  name: 'The Tree Remembers',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      bind: 'chosen',
      filter: {
        controller: 'enemy',
      },
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            loseAbilities: true,
          },
        },
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'chosen',
            filter: {
              maxCost: 3,
            },
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'defeat',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
