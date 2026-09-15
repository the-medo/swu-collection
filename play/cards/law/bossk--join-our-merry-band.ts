import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const bosskJoinOurMerryBand = {
  cardId: 'bossk--join-our-merry-band',
  name: 'Bossk, Join Our Merry Band',
  kind: 'unit',
  aspects: ['Vigilance', 'Command', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'change-stats',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 1,
                hp: 1,
                duration: 'phase',
              },
            },
          ],
        },
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: -1,
                hp: -1,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
