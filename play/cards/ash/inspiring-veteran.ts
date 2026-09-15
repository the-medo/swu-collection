import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const inspiringVeteran = {
  cardId: 'inspiring-veteran',
  name: 'Inspiring Veteran',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Resistance', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-units',
          filter: {
            exhausted: true,
          },
          max: 3,
          bind: 'targets',
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
                    token: 'advantage',
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
