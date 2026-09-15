import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const ig88MurderousPhlutdroid = {
  cardId: 'ig-88--murderous-phlutdroid',
  name: 'IG-88, Murderous Phlutdroid',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld', 'Droid', 'Bounty Hunter', 'Pilot'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'enemy',
          damaged: true,
        },
        amount: 1,
      },
      power: 3,
    },
  ],
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Aggression', 'Villainy'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 0,
      hp: 3,
    },
    grants: {
      constant: [
        {
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'enemy',
              damaged: true,
            },
            amount: 1,
          },
          power: 3,
        },
      ],
    },
  },
} as const satisfies UnitDefinition;
