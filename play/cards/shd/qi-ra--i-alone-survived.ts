import type { LeaderDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-recovery.json.
export const qiRaIAloneSurvived = {
  cardId: 'qi-ra--i-alone-survived',
  name: "Qi'ra, I Alone Survived",
  kind: 'leader',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Underworld'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 2,
                  },
                },
                {
                  kind: 'on-unit',
                  target: 'chosen',
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
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 0,
      hp: 8,
      arena: 'ground',
      keywords: ['Grit'],
      triggers: [
        {
          id: 'observe',
          timing: 'deployed',
          effects: [
            {
              kind: 'heal-units',
              filter: {},
              amount: 'all',
            },
            {
              kind: 'damage-units',
              filter: {},
              bind: 'damaged',
              amount: {
                kind: 'floor-divide',
                divisor: 2,
                value: {
                  kind: 'unit-stat',
                  target: 'damaged',
                  stat: 'remaining-hp',
                },
              },
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
