import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-conversions.json.
export const poeDameronOneHellOfAPilot = {
  cardId: 'poe-dameron--one-hell-of-a-pilot',
  name: 'Poe Dameron, One Hell of a Pilot',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Resistance', 'Pilot'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'launch-and-pilot',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'x-wing',
          count: 1,
        },
        {
          kind: 'attach-self',
          filter: {
            controller: 'friendly',
            trait: 'Vehicle',
            withoutPilot: true,
          },
          optional: true,
        },
      ],
    },
  ],
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Command', 'Heroism'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 2,
      hp: 3,
    },
  },
} as const satisfies UnitDefinition;
