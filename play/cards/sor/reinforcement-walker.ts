import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteReinforcementWalker = {
  cardId: 'reinforcement-walker',
  name: 'Reinforcement Walker',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Vehicle', 'Walker'],
  cost: 8,
  power: 6,
  hp: 9,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'deck',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 1,
          max: 1,
          bind: 'card',
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'draw',
                  effects: [
                    {
                      kind: 'draw-card',
                      target: 'card',
                    },
                  ],
                },
                {
                  id: 'discard',
                  effects: [
                    {
                      kind: 'move-card',
                      target: 'card',
                      from: 'deck',
                      to: 'discard',
                      effects: [
                        {
                          kind: 'heal-own-base',
                          amount: 3,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          top: 1,
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'deck',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 1,
          max: 1,
          bind: 'card',
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'draw',
                  effects: [
                    {
                      kind: 'draw-card',
                      target: 'card',
                    },
                  ],
                },
                {
                  id: 'discard',
                  effects: [
                    {
                      kind: 'move-card',
                      target: 'card',
                      from: 'deck',
                      to: 'discard',
                      effects: [
                        {
                          kind: 'heal-own-base',
                          amount: 3,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          top: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
