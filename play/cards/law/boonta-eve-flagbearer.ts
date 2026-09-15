import type { UnitDefinition } from '../definition.ts';

// LAW 112. Printed text is pinned in meta-board fixture.
export const boontaEveFlagbearer = {
  cardId: 'boonta-eve-flagbearer',
  name: 'Boonta Eve Flagbearer',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe'],
  cost: 1,
  power: 1,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'on-friendly-attack',
      timing: 'friendly-attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'no-other-unit-attacked',
            target: 'subject',
          },
          effects: [
            {
              kind: 'heal-own-base',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
