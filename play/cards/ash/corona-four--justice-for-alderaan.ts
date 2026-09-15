import type { UnitDefinition } from '../definition.ts';

// ASH 043. Printed text is pinned in meta-board fixture.
export const coronaFourJusticeForAlderaan = {
  cardId: 'corona-four--justice-for-alderaan',
  name: 'Corona Four, Justice for Alderaan',
  kind: 'unit',
  aspects: ['Cunning', 'Vigilance', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {},
          optional: true,
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
      ],
    },
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            nonLeader: true,
            powerAtMost: 0,
          },
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'defeat',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
