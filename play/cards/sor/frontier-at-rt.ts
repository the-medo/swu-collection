import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFrontierAtRt = {
  cardId: 'frontier-at-rt',
  name: 'Frontier AT-RT',
  kind: 'unit',
  aspects: [],
  traits: ['Vehicle', 'Walker'],
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          trait: 'Vehicle',
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Ambush'],
      },
    },
  ],
} as const satisfies UnitDefinition;
