import type { EventDefinition } from '../definition.ts';

// LOF 128. Printed text is pinned in the meta token fixture.
export const protectThePod = {
  cardId: 'protect-the-pod',
  name: 'Protect the Pod',
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
        withoutTrait: 'Vehicle',
      },
      optional: false,
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
                kind: 'damage',
                amount: {
                  kind: 'unit-stat',
                  target: 'ally',
                  stat: 'remaining-hp',
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
