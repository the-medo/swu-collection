import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const redSquadronXWing = {
  cardId: 'red-squadron-x-wing',
  name: 'Red Squadron X-Wing',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'damage-draw',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'damage-and-draw',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'damage',
                    amount: 2,
                  },
                  ifYouDo: [
                    {
                      kind: 'draw-cards',
                      amount: 1,
                    },
                  ],
                },
              ],
            },
            {
              id: 'decline',
              effects: [],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
