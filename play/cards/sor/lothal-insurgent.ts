import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLothalInsurgent = {
  cardId: 'lothal-insurgent',
  name: 'Lothal Insurgent',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'cards-played-this-phase-at-least',
            player: 'self',
            amount: 2,
          },
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
              player: 'enemy',
            },
            {
              kind: 'discard-random-hand',
              player: 'enemy',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
