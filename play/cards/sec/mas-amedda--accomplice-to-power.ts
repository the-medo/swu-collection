import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const masAmeddaAccompliceToPower = {
  cardId: 'mas-amedda--accomplice-to-power',
  name: 'Mas Amedda, Accomplice to Power',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Republic', 'Official'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Plot'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-units',
          filter: {
            trait: 'Official',
            otherThan: 'source',
          },
          bind: 'targets',
          max: 2,
          effects: [
            {
              kind: 'each-unit',
              filter: {
                inGroup: 'targets',
              },
              bind: 'chosen',
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
