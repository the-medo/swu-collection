import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteStarWingScout = {
  cardId: 'star-wing-scout',
  name: 'Star Wing Scout',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Vehicle', 'Fighter'],
  cost: 3,
  power: 4,
  hp: 1,
  arena: 'space',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'initiative',
          },
          effects: [
            {
              kind: 'draw-cards',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
