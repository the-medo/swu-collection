import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const mortarTrooper = {
  cardId: 'mortar-trooper',
  name: 'Mortar Trooper',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  actions: [
    {
      id: 'fire',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'damage-units',
          amount: 1,
          filter: {
            arena: 'ground',
          },
          max: 3,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
