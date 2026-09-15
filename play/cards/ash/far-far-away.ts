import type { EventDefinition } from '../definition.ts';

// ASH 236. Printed text is pinned in meta-board fixture.
export const farFarAway = {
  cardId: 'far-far-away',
  name: 'Far Far Away',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Gambit'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      bind: 'ally',
      filter: {
        controller: 'friendly',
        nonLeader: true,
      },
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'ally',
          operation: {
            kind: 'return-to-hand',
          },
          ifYouDo: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {
                controller: 'enemy',
                nonLeader: true,
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
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
