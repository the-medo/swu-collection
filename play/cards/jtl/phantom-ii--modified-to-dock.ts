import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-conversions.json.
export const phantomIiModifiedToDock = {
  cardId: 'phantom-ii--modified-to-dock',
  name: 'Phantom II, Modified to Dock',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport', 'Spectre'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'space',
  keywords: ['Grit'],
  actions: [
    {
      id: 'dock',
      costs: [
        {
          kind: 'resources',
          amount: 1,
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'attach-self',
          filter: {
            name: 'The Ghost',
          },
          optional: false,
        },
      ],
    },
  ],
  upgrade: {
    attachTo: 'unit',
    attachFilter: {
      name: 'The Ghost',
    },
    modifiers: {
      power: 3,
      hp: 3,
    },
    keywords: ['Grit'],
    actions: [
      {
        id: 'dock',
        costs: [
          {
            kind: 'resources',
            amount: 1,
          },
        ],
        limit: null,
        effects: [
          {
            kind: 'attach-self',
            filter: {
              name: 'The Ghost',
            },
            optional: false,
          },
        ],
      },
    ],
    grants: {
      keywords: ['Grit'],
    },
  },
} as const satisfies UnitDefinition;
