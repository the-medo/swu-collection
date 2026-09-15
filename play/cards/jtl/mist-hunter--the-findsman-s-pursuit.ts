import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 phase history and tokens fixture.
export const mistHunterTheFindsmanSPursuit = {
  cardId: 'mist-hunter--the-findsman-s-pursuit',
  name: "Mist Hunter, The Findsman's Pursuit",
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'hunter-draw',
      timing: 'attack',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'draw',
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
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
      condition: {
        kind: 'played-trait-this-phase',
        traits: ['Bounty Hunter', 'Pilot'],
      },
    },
  ],
} as const satisfies UnitDefinition;
