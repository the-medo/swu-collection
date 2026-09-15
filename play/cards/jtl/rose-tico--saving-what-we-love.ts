import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const roseTicoSavingWhatWeLove = {
  cardId: 'rose-tico--saving-what-we-love',
  name: 'Rose Tico, Saving What We Love',
  kind: 'leader',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Resistance'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'heal-vehicle',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                trait: 'Vehicle',
                attackedThisPhase: true,
              },
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'heal',
                    amount: 2,
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
      power: 4,
      hp: 6,
      arena: 'ground',
      triggers: [
        {
          id: 'heal-vehicle',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                trait: 'Vehicle',
              },
              optional: true,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'heal',
                    amount: 2,
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
