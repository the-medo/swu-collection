import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 attachment fixture.
export const theDesolationOfHoth = {
  cardId: 'the-desolation-of-hoth',
  name: 'The Desolation of Hoth',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Disaster'],
  cost: 6,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
        maxCost: 3,
      },
      bind: 'first',
      optional: true,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            maxCost: 3,
            otherThan: 'first',
          },
          bind: 'second',
          optional: true,
          effects: [
            {
              kind: 'defeat-bound',
              targets: ['first', 'second'],
            },
          ],
          otherwise: [
            {
              kind: 'defeat-bound',
              targets: ['first'],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
