import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRuggedSurvivors = {
  cardId: 'rugged-survivors',
  name: 'Rugged Survivors',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe'],
  cost: 5,
  power: 3,
  hp: 5,
  arena: 'ground',
  keywords: ['Grit'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              leader: true,
            },
            amount: 1,
          },
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
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
