import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const chirrutMweOneWithTheForce = {
  cardId: 'chirrut--mwe--one-with-the-force',
  name: 'Chirrut \u00cemwe, One With The Force',
  kind: 'leader',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Rebel'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 0,
                    hp: 2,
                    duration: 'phase',
                  },
                },
              ],
              optional: false,
              bind: 'chosen',
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
      hp: 5,
      arena: 'ground',
      constant: [
        {
          condition: {
            kind: 'phase',
            phase: 'action',
          },
          abilities: {
            surviveZeroHp: true,
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
