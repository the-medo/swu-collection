import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 traits and choices fixture.
export const nienNunbLoyalCoPilot = {
  cardId: 'nien-nunb--loyal-co-pilot',
  name: 'Nien Nunb, Loyal Co-Pilot',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Pilot'],
  unique: true,
  cost: 1,
  power: 1,
  hp: 2,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 1,
      aspects: ['Command', 'Heroism'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 1,
      hp: 2,
    },
    hostModifiers: [
      {
        condition: {
          kind: 'always',
        },
        power: {
          kind: 'cards-in-play-count',
          filter: {
            trait: 'Pilot',
            otherThan: 'source',
            roles: ['unit', 'upgrade'],
            controller: 'friendly',
          },
        },
      },
    ],
  },
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'cards-in-play-count',
        filter: {
          trait: 'Pilot',
          otherThan: 'source',
          roles: ['unit', 'upgrade'],
          controller: 'friendly',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
