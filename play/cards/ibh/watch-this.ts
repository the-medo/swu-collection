import type { EventDefinition } from '../definition.ts';

// IBH 052. Printed text is pinned in meta-movement fixture.
export const watchThis = {
  cardId: 'watch-this',
  name: 'Watch This',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Gambit'],
  cost: 6,
  effects: [
    {
      kind: 'select-unit',
      bind: 'chosen',
      filter: {
        nonLeader: true,
        maxCost: 6,
      },
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'return-to-hand',
          },
        },
        {
          kind: 'each-unit',
          filter: {
            controller: 'enemy',
            sameArenaAs: 'chosen',
            otherThan: 'chosen',
          },
          bind: 'other',
          effects: [
            {
              kind: 'on-unit',
              target: 'other',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
