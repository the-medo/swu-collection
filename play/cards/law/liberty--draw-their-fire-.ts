import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 attachment fixture.
export const libertyDrawTheirFire = {
  cardId: 'liberty--draw-their-fire-',
  name: 'Liberty, Draw Their Fire!',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 8,
  power: 9,
  hp: 7,
  arena: 'space',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'remove-upgrades-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
            {
              kind: 'select-upgrades',
              min: 'all',
              max: 'all',
              filter: {
                attachedTo: 'chosen',
                maxCost: 4,
              },
              bind: 'upgrades',
              effects: [
                {
                  kind: 'move-upgrades',
                  group: 'upgrades',
                  to: 'hand',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'remove-upgrades-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
            {
              kind: 'select-upgrades',
              min: 'all',
              max: 'all',
              filter: {
                attachedTo: 'chosen',
                maxCost: 4,
              },
              bind: 'upgrades',
              effects: [
                {
                  kind: 'move-upgrades',
                  group: 'upgrades',
                  to: 'hand',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
