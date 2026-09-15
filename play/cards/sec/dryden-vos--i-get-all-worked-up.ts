import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 control and timing fixture.
export const drydenVosIGetAllWorkedUp = {
  cardId: 'dryden-vos--i-get-all-worked-up',
  name: 'Dryden Vos, I Get All Worked Up',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld'],
  unique: true,
  cost: 4,
  power: 2,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'double-power',
      timing: 'attack',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'modify',
            power: {
              kind: 'unit-stat',
              target: 'source',
              stat: 'power',
            },
            hp: 0,
            duration: 'attack',
          },
        },
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'next-regroup',
            skipRegroupReady: true,
          },
        },
      ],
      optional: true,
    },
  ],
} as const satisfies UnitDefinition;
