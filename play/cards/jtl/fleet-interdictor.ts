import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const fleetInterdictor = {
  cardId: 'fleet-interdictor',
  name: 'Fleet Interdictor',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  cost: 7,
  power: 6,
  hp: 6,
  arena: 'space',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'defeat-space',
      timing: 'defeated',
      effects: [
        {
          kind: 'defeat-unit',
          filter: {
            arena: 'space',
            maxCost: 3,
          },
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
