import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 traits and choices fixture.
export const theMandalorianWeatheredPilot = {
  cardId: 'the-mandalorian--weathered-pilot',
  name: 'The Mandalorian, Weathered Pilot',
  kind: 'unit',
  aspects: ['Cunning', 'Cunning'],
  traits: ['Mandalorian', 'Bounty Hunter', 'Pilot'],
  unique: true,
  cost: 5,
  power: 5,
  hp: 6,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Cunning'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 3,
      hp: 1,
    },
    triggers: [
      {
        id: 'pilot-exhaust',
        timing: 'played',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              controller: 'enemy',
              sameArenaAs: 'attached',
            },
            optional: false,
            bind: 'chosen',
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'exhaust',
                },
              },
            ],
          },
        ],
      },
    ],
  },
  triggers: [
    {
      id: 'unit-exhaust',
      timing: 'played',
      effects: [
        {
          kind: 'select-units',
          filter: {
            arena: 'ground',
          },
          max: 2,
          bind: 'chosen',
          effects: [
            {
              kind: 'exhaust-group',
              group: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
