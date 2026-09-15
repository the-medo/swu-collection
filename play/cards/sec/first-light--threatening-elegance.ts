import type { UnitDefinition } from '../definition.ts';

// Text is pinned in meta-attack-outcomes; v8 end-of-attack timing applies.
export const firstLightThreateningElegance = {
  cardId: 'first-light--threatening-elegance',
  name: 'First Light, Threatening Elegance',
  aspects: ['Command', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 7,
  power: 5,
  hp: 7,
  kind: 'unit',
  arena: 'space',
  keywords: ['Ambush', 'Plot'],
  triggers: [
    {
      id: 'draw-after-defeat',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'value-at-least',
            name: 'defender-defeated',
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
                  id: 'skip',
                  effects: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  unique: true,
} as const satisfies UnitDefinition;
