import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-interactions.json.
export const chokeOnAspirations = {
  cardId: 'choke-on-aspirations',
  name: 'Choke on Aspirations',
  kind: 'event',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        withoutTrait: 'Vehicle',
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'divide-damage',
          amount: 5,
          filter: {
            sameAs: 'chosen',
          },
          optional: false,
          upTo: true,
          after: [
            {
              kind: 'if',
              condition: {
                kind: 'unit-matches',
                target: 'chosen',
                filter: {},
              },
              effects: [
                {
                  kind: 'heal-own-base',
                  amount: {
                    kind: 'value',
                    name: 'damage-dealt',
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
