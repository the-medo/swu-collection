import type { UnitDefinition } from '../definition.ts';

// LAW 089. Printed text is pinned in meta-board fixture.
export const kananJarrusSpectreOne = {
  cardId: 'kanan-jarrus--spectre-one',
  name: 'Kanan Jarrus, Spectre One',
  kind: 'unit',
  aspects: ['Vigilance', 'Cunning', 'Heroism'],
  traits: ['Force', 'Jedi', 'Rebel', 'Spectre'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'ground',
  restore: 1,
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              anyAspect: ['Command', 'Aggression'],
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {
                nonLeader: true,
                maxCost: 4,
              },
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'return-to-hand',
                  },
                },
              ],
            },
          ],
          otherwise: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {
                nonLeader: true,
                maxCost: 2,
              },
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'return-to-hand',
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
