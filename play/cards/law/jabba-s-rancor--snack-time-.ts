import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const jabbaSRancorSnackTime = {
  cardId: 'jabba-s-rancor--snack-time-',
  name: "Jabba's Rancor, Snack Time!",
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Creature'],
  unique: true,
  cost: 7,
  power: 7,
  hp: 7,
  arena: 'ground',
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'enemy-chooses',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            arena: 'ground',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'deal-seven',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'damage',
                        amount: 7,
                      },
                    },
                  ],
                },
                {
                  id: 'decline',
                  effects: [],
                },
              ],
            },
          ],
          chooser: 'enemy',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
