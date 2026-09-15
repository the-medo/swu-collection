import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const millenniumFalconDodgingPatrols = {
  cardId: 'millennium-falcon--dodging-patrols',
  name: 'Millennium Falcon, Dodging Patrols',
  kind: 'unit',
  aspects: ['Command', 'Cunning', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 5,
  arena: 'space',
  triggers: [
    {
      id: 'change-power',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'space',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: -2,
                hp: 0,
                duration: 'phase',
              },
            },
          ],
        },
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 0,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
