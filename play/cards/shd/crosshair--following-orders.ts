import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCrosshairFollowingOrders = {
  cardId: 'crosshair--following-orders',
  name: 'Crosshair, Following Orders',
  kind: 'unit',
  aspects: ['Villainy', 'Command'],
  traits: ['Imperial', 'Clone', 'Trooper'],
  cost: 4,
  unique: true,
  power: 2,
  hp: 6,
  arena: 'ground',
  actions: [
    {
      id: 'increase-power',
      costs: [
        {
          kind: 'resources',
          amount: 2,
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'modify',
            power: 1,
            hp: 0,
            duration: 'phase',
          },
        },
      ],
    },
    {
      id: 'shoot',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            arena: 'ground',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: {
                kind: 'unit-stat',
                target: 'source',
                stat: 'power',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
