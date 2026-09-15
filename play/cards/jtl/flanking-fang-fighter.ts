import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const flankingFangFighter = {
  cardId: 'flanking-fang-fighter',
  name: 'Flanking Fang Fighter',
  kind: 'unit',
  aspects: [],
  traits: ['Mandalorian', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 2,
  hp: 3,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Fighter',
          otherThan: 'source',
        },
        amount: 1,
      },
      abilities: {
        raid: 2,
      },
    },
  ],
} as const satisfies UnitDefinition;
