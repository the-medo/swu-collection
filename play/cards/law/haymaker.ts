import type { EventDefinition } from '../definition.ts';

// LAW 168. Printed text is pinned in the meta token fixture.
export const haymaker = {
  cardId: 'haymaker',
  name: 'Haymaker',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      bind: 'ally',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'ally',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: 1,
          },
        },
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            controller: 'enemy',
            sameArenaAs: 'ally',
          },
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: {
                  kind: 'unit-stat',
                  target: 'ally',
                  stat: 'power',
                },
                source: 'ally',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
