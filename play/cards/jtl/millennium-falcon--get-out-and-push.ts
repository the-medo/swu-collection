import type { UnitDefinition } from '../definition.ts';

// JTL 249. Printed text is pinned in meta-continuous fixture.
export const millenniumFalconGetOutAndPush = {
  cardId: 'millennium-falcon--get-out-and-push',
  name: 'Millennium Falcon, Get Out And Push',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 4,
  arena: 'space',
  extraPilotSlots: 1,
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'upgrades-count',
        target: 'source',
        trait: 'Pilot',
      },
    },
  ],
} as const satisfies UnitDefinition;
