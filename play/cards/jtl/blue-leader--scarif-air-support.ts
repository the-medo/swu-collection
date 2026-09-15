import type { UnitDefinition } from '../definition.ts';

// JTL 096. Printed text is pinned in meta-movement fixture.
export const blueLeaderScarifAirSupport = {
  cardId: 'blue-leader--scarif-air-support',
  name: 'Blue Leader, Scarif Air Support',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'space',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 2,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'move-arena',
                arena: 'ground',
              },
            },
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 2,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
