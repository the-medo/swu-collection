import type { UnitDefinition } from '../definition.ts';

// SEC . Printed text is pinned in the meta effects fixture.
export const blueAceColorfulRacer = {
  cardId: 'blue-ace--colorful-racer',
  name: 'Blue Ace, Colorful Racer',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Resistance', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'space',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            controller: 'enemy',
            exhausted: true,
          },
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;
