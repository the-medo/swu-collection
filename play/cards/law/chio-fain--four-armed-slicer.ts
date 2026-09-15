import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const chioFainFourArmedSlicer = {
  cardId: 'chio-fain--four-armed-slicer',
  name: 'Chio Fain, Four-Armed Slicer',
  kind: 'unit',
  aspects: ['Vigilance', 'Aggression'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'both-draw',
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                },
                {
                  kind: 'draw-cards',
                  amount: 1,
                  player: 'enemy',
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
