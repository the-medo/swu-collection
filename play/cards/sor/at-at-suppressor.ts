import type { UnitDefinition } from '../definition.ts';

// Reprinted in IC27 027; identity and text follow the official catalog.
export const ic27ReprintAtAtSuppressor = {
  cardId: 'at-at-suppressor',
  name: 'AT-AT Suppressor',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Imperial', 'Vehicle', 'Walker'],
  cost: 8,
  power: 8,
  hp: 8,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'exhaust-units',
          filter: {
            arena: 'ground',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
