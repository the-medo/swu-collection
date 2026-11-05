import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteJabbaSRancorPateesa = {
  cardId: 'jabba-s-rancor--pateesa',
  name: "Jabba's Rancor, Pateesa",
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Underworld', 'Creature'],
  cost: 8,
  unique: true,
  power: 9,
  hp: 9,
  arena: 'ground',
  costReductions: [
    {
      condition: {
        kind: 'controls-name',
        name: 'Jabba the Hutt',
      },
      amount: 1,
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            arena: 'ground',
            otherThan: 'source',
          },
          optional: false,
          bind: 'friendly',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
                arena: 'ground',
              },
              optional: false,
              bind: 'enemy',
              effects: [
                {
                  kind: 'damage-bound',
                  targets: ['friendly', 'enemy'],
                  amount: 3,
                },
              ],
              allowMissing: true,
            },
          ],
          allowMissing: true,
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            arena: 'ground',
            otherThan: 'source',
          },
          optional: false,
          bind: 'friendly',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
                arena: 'ground',
              },
              optional: false,
              bind: 'enemy',
              effects: [
                {
                  kind: 'damage-bound',
                  targets: ['friendly', 'enemy'],
                  amount: 3,
                },
              ],
              allowMissing: true,
            },
          ],
          allowMissing: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
