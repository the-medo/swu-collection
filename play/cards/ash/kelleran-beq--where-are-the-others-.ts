import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const kelleranBeqWhereAreTheOthers = {
  cardId: 'kelleran-beq--where-are-the-others-',
  name: 'Kelleran Beq, Where are the Others?',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Jedi'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  keywords: ['Ambush'],
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'unit-count',
        filter: {
          powerAtMost: 0,
          otherThan: 'source',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
