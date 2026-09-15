import type { UnitDefinition } from '../definition.ts';

// ASH . Printed text is pinned in the meta effects fixture.
export const t6Shuttle1974WithAMentorSDedication = {
  cardId: 't-6-shuttle-1974--with-a-mentor-s-dedication',
  name: "T-6 Shuttle 1974, With a Mentor's Dedication",
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Jedi', 'Vehicle', 'Transport'],
  unique: true,
  cost: 4,
  power: 2,
  hp: 6,
  arena: 'space',
  keywords: ['Sentinel'],
  actions: [
    {
      id: 'support-unit',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            otherThan: 'source',
          },
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 2,
                duration: 'phase',
              },
            },
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: true,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
