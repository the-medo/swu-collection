import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-advanced.json.
export const eyeOfSionDeliveredFromExile = {
  cardId: 'eye-of-sion--delivered-from-exile',
  name: 'Eye of Sion, Delivered from Exile',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Vehicle', 'Transport'],
  unique: true,
  cost: 7,
  power: 5,
  hp: 8,
  arena: 'space',
  actions: [
    {
      id: 'search',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'search-deck',
          count: 8,
          filter: 'unit',
          cardFilter: {
            costAtMost: {
              kind: 'unit-stat',
              target: 'source',
              stat: 'power',
            },
          },
          max: 1,
          play: {
            discount: 0,
            free: true,
            ready: true,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
