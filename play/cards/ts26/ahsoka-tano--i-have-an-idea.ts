import type { LeaderDefinition } from '../definition.ts';

// Official face text and clarifications are pinned in leader-private-choices.json.
export const ahsokaTanoIHaveAnIdea = {
  cardId: 'ahsoka-tano--i-have-an-idea',
  name: 'Ahsoka Tano, I Have an Idea',
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      triggers: [
        {
          id: 'observe',
          timing: 'friendly-card-played',
          effects: [
            {
              kind: 'pay',
              costs: [
                {
                  kind: 'exhaust-self',
                },
              ],
              optional: true,
              effects: [
                {
                  kind: 'inspect-zone',
                  zone: 'deck',
                  player: 'self',
                  chooser: 'self',
                  filter: {},
                  min: 1,
                  max: 1,
                  bind: 'top',
                  effects: [
                    {
                      kind: 'choose-mode',
                      options: [
                        {
                          id: 'play',
                          effects: [
                            {
                              kind: 'play-card',
                              from: 'deck',
                              target: 'top',
                              filter: {},
                              discount: 0,
                              optional: true,
                            },
                          ],
                        },
                        {
                          id: 'discard',
                          effects: [
                            {
                              kind: 'move-card',
                              from: 'deck',
                              to: 'discard',
                              target: 'top',
                            },
                          ],
                        },
                        {
                          id: 'leave',
                          effects: [],
                        },
                      ],
                    },
                  ],
                  top: 1,
                },
              ],
            },
          ],
          condition: {
            kind: 'card-matches',
            target: 'subject',
            filter: {
              kind: 'event',
            },
          },
        },
      ],
      actions: [
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 6,
      arena: 'ground',
      raid: 1,
      triggers: [
        {
          id: 'observe',
          timing: 'attack-ended',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'deck',
              player: 'self',
              chooser: 'self',
              filter: {},
              min: 1,
              max: 1,
              bind: 'top',
              effects: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'play',
                      effects: [
                        {
                          kind: 'play-card',
                          from: 'deck',
                          target: 'top',
                          filter: {},
                          discount: 1,
                          optional: true,
                        },
                      ],
                    },
                    {
                      id: 'discard',
                      effects: [
                        {
                          kind: 'move-card',
                          from: 'deck',
                          to: 'discard',
                          target: 'top',
                        },
                      ],
                    },
                    {
                      id: 'leave',
                      effects: [],
                    },
                  ],
                },
              ],
              top: 1,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
