import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-interactions.json.
export const jarekYeagerCoordinatingWithTheResistance = {
  cardId: 'jarek-yeager--coordinating-with-the-resistance',
  name: 'Jarek Yeager, Coordinating With The Resistance',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Resistance', 'Pilot'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Command'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 2,
      hp: 2,
    },
    grantsCondition: {
      kind: 'all',
      conditions: [
        {
          kind: 'units-at-least',
          filter: {
            controller: 'friendly',
            arena: 'ground',
          },
          amount: 1,
        },
        {
          kind: 'units-at-least',
          filter: {
            controller: 'friendly',
            arena: 'space',
          },
          amount: 1,
        },
      ],
    },
    grants: {
      keywords: ['Sentinel'],
    },
  },
} as const satisfies UnitDefinition;
