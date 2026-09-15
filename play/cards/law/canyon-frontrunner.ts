import type { UnitDefinition } from '../definition.ts';

// LAW 228. Printed text is pinned in meta-board fixture.
export const canyonFrontrunner = {
  cardId: 'canyon-frontrunner',
  name: 'Canyon Frontrunner',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Vehicle', 'Speeder'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'no-other-unit-attacked',
            target: 'source',
          },
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {},
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: -2,
                    hp: 0,
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
