import type { UnitDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-attachments fixture.
export const sabineWrenILearnedTheHardWay = {
  cardId: 'sabine-wren--i-learned-the-hard-way',
  name: 'Sabine Wren, I Learned the Hard Way',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Jedi', 'Mandalorian', 'Spectre'],
  cost: 5,
  unique: true,
  power: 4,
  hp: 5,
  arena: 'ground',
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'upgrades-exhaust',
      timing: 'upgrades-attached',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
          },
          bind: 'chosen',
          optional: true,
          allowMissing: true,
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
} as const satisfies UnitDefinition;
