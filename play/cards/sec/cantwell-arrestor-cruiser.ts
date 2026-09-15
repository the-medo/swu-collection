import type { UnitDefinition } from '../definition.ts';

// SEC 037. Printed text and rulings are pinned in meta-disclose fixture.
export const cantwellArrestorCruiser = {
  cardId: 'cantwell-arrestor-cruiser',
  name: 'Cantwell Arrestor Cruiser',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  cost: 7,
  power: 6,
  hp: 7,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Vigilance', 'Vigilance', 'Villainy'],
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
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
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 0,
                    hp: 0,
                    duration: 'source-in-play',
                    cannotReady: true,
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
