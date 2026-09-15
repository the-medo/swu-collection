import type { UnitDefinition } from '../definition.ts';

// SEC 215. Printed text is pinned in meta-movement fixture.
export const emissarySSheathipede = {
  cardId: 'emissary-s-sheathipede',
  name: "Emissary's Sheathipede",
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Separatist', 'Vehicle', 'Transport'],
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-resources',
          player: 'enemy',
          exhausted: true,
          min: 0,
          max: 1,
          operation: 'ready',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
