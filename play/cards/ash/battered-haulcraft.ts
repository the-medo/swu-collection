import type { UnitDefinition } from '../definition.ts';

// ASH 071. Printed text is pinned in the meta token fixture.
export const batteredHaulcraft = {
  cardId: 'battered-haulcraft',
  name: 'Battered Haulcraft',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Vehicle', 'Transport'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          bind: 'enemy',
          filter: {
            controller: 'enemy',
            arena: 'space',
          },
          optional: false,
          effects: [
            {
              kind: 'damage-bound',
              targets: ['source', 'enemy'],
              amount: 1,
            },
          ],
          allowMissing: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
