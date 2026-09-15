import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const bogDownInProcedure = {
  cardId: 'bog-down-in-procedure',
  name: 'Bog Down in Procedure',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Law'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      bind: 'first',
      optional: false,
      effects: [
        { kind: 'on-unit', target: 'first', operation: { kind: 'exhaust' } },
        {
          kind: 'disclose',
          aspects: ['Cunning'],
          effects: [
            {
              kind: 'select-unit',
              filter: { otherThan: 'first' },
              bind: 'second',
              optional: false,
              effects: [{ kind: 'on-unit', target: 'second', operation: { kind: 'exhaust' } }],
            },
          ],
        },
      ],
      otherwise: [{ kind: 'disclose', aspects: ['Cunning'], effects: [] }],
    },
  ],
} as const satisfies EventDefinition;
