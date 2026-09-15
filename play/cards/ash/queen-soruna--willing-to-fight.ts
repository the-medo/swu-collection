import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const queenSorunaWillingToFight = {
  cardId: 'queen-soruna--willing-to-fight',
  name: 'Queen Soruna, Willing to Fight',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Naboo', 'Official'],
  unique: true,
  cost: 6,
  power: 5,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'self',
          filter: {
            kind: 'unit',
          },
          min: 0,
          max: 1,
          bind: 'revealed',
          reveal: true,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                costEquals: {
                  kind: 'card-cost',
                  target: 'revealed',
                },
              },
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 3,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'self',
          filter: {
            kind: 'unit',
          },
          min: 0,
          max: 1,
          bind: 'revealed',
          reveal: true,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                costEquals: {
                  kind: 'card-cost',
                  target: 'revealed',
                },
              },
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 3,
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
