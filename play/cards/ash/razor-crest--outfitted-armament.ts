import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const razorCrestOutfittedArmament = {
  cardId: 'razor-crest--outfitted-armament',
  name: 'Razor Crest, Outfitted Armament',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Mandalorian', 'Vehicle', 'Transport'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'space',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'discard-for-power',
      timing: 'attack',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'self',
          filter: {},
          min: 0,
          max: 1,
          bind: 'card',
          effects: [
            {
              kind: 'move-card',
              target: 'card',
              from: 'hand',
              to: 'discard',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'modify',
                    power: 2,
                    hp: 0,
                    duration: 'attack',
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
