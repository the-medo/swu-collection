import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFifthBrotherFearHunter = {
  cardId: 'fifth-brother--fear-hunter',
  name: 'Fifth Brother, Fear Hunter',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Imperial', 'Inquisitor'],
  cost: 3,
  unique: true,
  power: 2,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'always',
      },
      raid: {
        kind: 'unit-stat',
        target: 'source',
        stat: 'damage',
      },
    },
  ],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'resolve',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    arena: 'ground',
                    otherThan: 'source',
                  },
                  optional: false,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'damage-bound',
                      targets: ['source', 'chosen'],
                      amount: 1,
                    },
                  ],
                  allowMissing: true,
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
    },
  ],
} as const satisfies UnitDefinition;
