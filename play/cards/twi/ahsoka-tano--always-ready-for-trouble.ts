import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAhsokaTanoAlwaysReadyForTrouble = {
  cardId: 'ahsoka-tano--always-ready-for-trouble',
  name: 'Ahsoka Tano, Always Ready For Trouble',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'unit-count-comparison',
        relation: 'less',
      },
      abilities: {
        keywords: ['Ambush'],
      },
    },
  ],
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'resources',
          amount: 2,
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'return-unit-with-upgrades',
          target: 'source',
          upgrades: 'returned-upgrades',
          freeNextCopy: false,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
