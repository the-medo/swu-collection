import type { EventDefinition } from '../definition.ts';

// SEC 233. Printed text is pinned in meta-hidden-zones fixture.
export const beguile = {
  cardId: 'beguile',
  name: 'Beguile',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Trick'],
  cost: 3,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'hand',
      player: 'enemy',
      chooser: 'self',
      filter: {},
      min: 0,
      max: 0,
      bind: 'unused',
      effects: [],
      after: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            maxCost: 6,
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'return-to-hand',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
