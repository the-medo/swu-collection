import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const paladinTrainingCorvette = {
  cardId: 'paladin-training-corvette',
  name: 'Paladin Training Corvette',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Jedi', 'Republic', 'Vehicle', 'Capital Ship'],
  cost: 5,
  power: 3,
  hp: 5,
  arena: 'space',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-units',
          filter: {
            trait: 'Force',
          },
          min: 0,
          max: 3,
          bind: 'group',
          effects: [
            {
              kind: 'each-unit',
              filter: {
                inGroup: 'group',
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
