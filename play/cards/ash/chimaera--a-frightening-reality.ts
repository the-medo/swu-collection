import type { UnitDefinition } from '../definition.ts';

// ASH 052. Printed text is pinned in the meta token fixture.
export const chimaeraAFrighteningReality = {
  cardId: 'chimaera--a-frightening-reality',
  name: 'Chimaera, A Frightening Reality',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 7,
  power: 6,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            amount: 1,
            filter: {
              controller: 'enemy',
              nonLeader: true,
            },
          },
          effects: [
            {
              kind: 'select-unit',
              bind: 'friendly',
              filter: {
                controller: 'friendly',
              },
              optional: true,
              effects: [
                {
                  kind: 'select-unit',
                  bind: 'enemy',
                  filter: {
                    controller: 'enemy',
                    nonLeader: true,
                  },
                  optional: false,
                  effects: [
                    {
                      kind: 'defeat-bound',
                      targets: ['friendly', 'enemy'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'on-enemy-defeated',
      timing: 'enemy-defeated',
      effects: [
        {
          kind: 'heal-own-base',
          amount: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
