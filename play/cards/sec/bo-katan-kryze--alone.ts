import type { UnitDefinition } from '../definition.ts';

// SEC 051. Printed text is pinned in meta-board fixture.
export const boKatanKryzeAlone = {
  cardId: 'bo-katan-kryze--alone',
  name: 'Bo-Katan Kryze, Alone',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Mandalorian'],
  unique: true,
  cost: 9,
  power: 8,
  hp: 8,
  arena: 'ground',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'modify-units',
          filter: {
            controller: 'enemy',
          },
          operation: {
            kind: 'modify',
            power: -3,
            hp: -3,
            duration: 'phase',
          },
        },
      ],
    },
    {
      id: 'on-enemy-defeated',
      timing: 'enemy-defeated',
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            controller: 'friendly',
          },
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
