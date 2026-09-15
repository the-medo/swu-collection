import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const hiddenHandSupplier = {
  cardId: 'hidden-hand-supplier',
  name: 'Hidden Hand Supplier',
  kind: 'unit',
  aspects: [],
  traits: ['Underworld'],
  cost: 1,
  power: 1,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                otherThan: 'source',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'experience',
                    count: 1,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
