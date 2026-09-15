import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const wattoNoMoneyNoPartsNoDeal = {
  cardId: 'watto--no-money--no-parts--no-deal',
  name: 'Watto, No Money, No Parts, No Deal',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe'],
  unique: true,
  cost: 3,
  power: 1,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'choose-mode',
          chooser: 'enemy',
          options: [
            {
              id: 'give-experience',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
                        count: 1,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'draw-a-card',
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
