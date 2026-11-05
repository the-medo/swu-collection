import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKalaniAnalyticalGeneral = {
  cardId: 'kalani--analytical-general',
  name: 'Kalani, Analytical General',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Separatist', 'Droid'],
  cost: 6,
  unique: true,
  power: 5,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-units',
          filter: {
            otherThan: 'source',
          },
          bind: 'chosen',
          min: 0,
          max: {
            kind: 'conditional',
            condition: {
              kind: 'initiative',
            },
            then: 2,
            otherwise: 1,
          },
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
                    kind: 'modify',
                    power: 2,
                    hp: 2,
                    duration: 'phase',
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
