import type { UnitDefinition } from '../definition.ts';

// Reprinted in IC27 108; identity and text follow the official catalog.
export const ic27ReprintSavageOpressMonster = {
  cardId: 'savage-opress--monster',
  name: 'Savage Opress, Monster',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Night', 'Underworld'],
  cost: 7,
  unique: true,
  power: 7,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-count-comparison',
            relation: 'less',
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
