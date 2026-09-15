import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const r2D2KnownToMakeMistakes = {
  cardId: 'r2-d2--known-to-make-mistakes',
  name: 'R2-D2, Known to Make Mistakes',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Droid'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              anyAspect: ['Command'],
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
                arena: 'ground',
                maxCost: 4,
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'exhaust',
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
