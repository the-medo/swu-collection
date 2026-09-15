import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const lukeSkywalkerProfitOrBeDestroyed = {
  cardId: 'luke-skywalker--profit-or-be-destroyed',
  name: 'Luke Skywalker, Profit or Be Destroyed',
  kind: 'unit',
  aspects: ['Aggression', 'Cunning', 'Heroism'],
  traits: ['Force', 'Jedi', 'Rebel'],
  unique: true,
  cost: 7,
  power: 9,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          chooser: 'enemy',
          options: [
            {
              id: 'credit-and-ready',
              effects: [
                {
                  kind: 'create-credits',
                  amount: 1,
                  player: 'enemy',
                },
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'ready',
                  },
                },
              ],
            },
            {
              id: 'damage-five',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  bind: 'chosen',
                  optional: true,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'damage',
                        amount: 5,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
