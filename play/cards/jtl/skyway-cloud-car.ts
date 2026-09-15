import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const skywayCloudCar = {
  cardId: 'skyway-cloud-car',
  name: 'Skyway Cloud Car',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'parting-return',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            nonLeader: true,
            powerAtMost: 2,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'return-to-hand',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
