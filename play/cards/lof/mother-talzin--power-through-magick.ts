import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const motherTalzinPowerThroughMagick = {
  cardId: 'mother-talzin--power-through-magick',
  name: 'Mother Talzin, Power Through Magick',
  kind: 'leader',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'Night'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'weaken',
          costs: [
            {
              kind: 'exhaust-self',
            },
            {
              kind: 'force',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: -1,
                    hp: -1,
                    duration: 'phase',
                  },
                },
              ],
            },
          ],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'attack-weaken',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: -1,
                    hp: -1,
                    duration: 'phase',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
