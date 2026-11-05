import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTheArmorerSurvivalIsStrength = {
  cardId: 'the-armorer--survival-is-strength',
  name: 'The Armorer, Survival Is Strength',
  kind: 'unit',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Mandalorian'],
  cost: 5,
  unique: true,
  power: 3,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-units',
          filter: {
            trait: 'Mandalorian',
          },
          bind: 'chosen',
          min: 0,
          max: 3,
          effects: [
            {
              kind: 'each-unit',
              filter: {
                inGroup: 'chosen',
              },
              bind: 'recipient',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'recipient',
                  operation: {
                    kind: 'give-token',
                    token: 'shield',
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
