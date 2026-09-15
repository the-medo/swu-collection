import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const swarmingVultureDroid = {
  cardId: 'swarming-vulture-droid',
  name: 'Swarming Vulture Droid',
  kind: 'unit',
  aspects: [],
  traits: ['Separatist', 'Droid', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'unit-count',
        filter: {
          controller: 'friendly',
          name: 'Swarming Vulture Droid',
          otherThan: 'source',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
