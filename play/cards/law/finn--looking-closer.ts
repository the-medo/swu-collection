import type { UnitDefinition } from '../definition.ts';

// LAW 095. Printed text is pinned in the meta token fixture.
export const finnLookingCloser = {
  cardId: 'finn--looking-closer',
  name: 'Finn, Looking Closer',
  kind: 'unit',
  aspects: ['Vigilance', 'Cunning'],
  traits: ['Resistance'],
  unique: true,
  cost: 6,
  power: 6,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            unique: false,
          },
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;
