import type { UnitDefinition } from '../definition.ts';

// JTL 119. Printed text is pinned in meta-board fixture.
export const resupplyCarrier = {
  cardId: 'resupply-carrier',
  name: 'Resupply Carrier',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  cost: 6,
  power: 4,
  hp: 5,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'resource-top',
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
