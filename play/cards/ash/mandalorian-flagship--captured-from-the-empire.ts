import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const mandalorianFlagshipCapturedFromTheEmpire = {
  cardId: 'mandalorian-flagship--captured-from-the-empire',
  name: 'Mandalorian Flagship, Captured from the Empire',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Mandalorian', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 7,
  power: 4,
  hp: 8,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          leader: true,
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Ambush'],
      },
    },
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'unit-count',
        filter: {
          controller: 'friendly',
          trait: 'Mandalorian',
          otherThan: 'source',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
