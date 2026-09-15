import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const terentatek = {
  cardId: 'terentatek',
  name: 'Terentatek',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Creature'],
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'enemy',
          trait: 'Force',
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Ambush'],
      },
    },
  ],
} as const satisfies UnitDefinition;
