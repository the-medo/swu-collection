import type { UnitDefinition } from '../definition.ts';

// ASH 133. Printed text is pinned in meta-hidden-zones fixture.
export const traskWalker = {
  cardId: 'trask-walker',
  name: 'Trask Walker',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Vehicle', 'Walker'],
  cost: 8,
  power: 5,
  hp: 9,
  arena: 'ground',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'self',
          chooser: 'self',
          filter: {
            kind: 'unit',
            maxCost: 7,
          },
          min: 1,
          max: 1,
          bind: 'chosen-card',
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'bottom-and-heal',
                  effects: [
                    {
                      kind: 'move-card',
                      target: 'chosen-card',
                      from: 'discard',
                      to: 'deck-bottom',
                      effects: [
                        {
                          kind: 'heal-own-base',
                          amount: 3,
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'return-to-hand',
                  effects: [
                    {
                      kind: 'move-card',
                      target: 'chosen-card',
                      from: 'discard',
                      to: 'hand',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'self',
          chooser: 'self',
          filter: {
            kind: 'unit',
            maxCost: 7,
          },
          min: 1,
          max: 1,
          bind: 'chosen-card',
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'bottom-and-heal',
                  effects: [
                    {
                      kind: 'move-card',
                      target: 'chosen-card',
                      from: 'discard',
                      to: 'deck-bottom',
                      effects: [
                        {
                          kind: 'heal-own-base',
                          amount: 3,
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'return-to-hand',
                  effects: [
                    {
                      kind: 'move-card',
                      target: 'chosen-card',
                      from: 'discard',
                      to: 'hand',
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
