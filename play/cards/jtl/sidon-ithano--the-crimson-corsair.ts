import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-conversions.json.
export const sidonIthanoTheCrimsonCorsair = {
  cardId: 'sidon-ithano--the-crimson-corsair',
  name: 'Sidon Ithano, The Crimson Corsair',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Pilot'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'board-enemy',
      timing: 'played',
      effects: [
        {
          kind: 'attach-self',
          filter: {
            controller: 'enemy',
            trait: 'Vehicle',
            withoutPilot: true,
          },
          optional: true,
        },
      ],
    },
  ],
  upgrade: {
    attachTo: 'unit',
    attachFilter: {
      controller: 'enemy',
      trait: 'Vehicle',
      withoutPilot: true,
    },
    modifiers: {
      power: -2,
      hp: -2,
    },
  },
} as const satisfies UnitDefinition;
