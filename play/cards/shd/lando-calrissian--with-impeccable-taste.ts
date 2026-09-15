import type { LeaderDefinition } from '../definition.ts';

// Official face text is pinned in leader-smuggle.json.
export const landoCalrissianWithImpeccableTaste = {
  cardId: 'lando-calrissian--with-impeccable-taste',
  name: 'Lando Calrissian, With Impeccable Taste',
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld'],
  unique: true,
  printedCost: 4,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'play-card',
              from: 'resources',
              using: 'smuggle',
              filter: {},
              discount: 2,
              optional: false,
              beforePlayed: [
                {
                  kind: 'inspect-zone',
                  zone: 'resources',
                  player: 'self',
                  chooser: 'self',
                  filter: {
                    owner: 'self',
                  },
                  min: 1,
                  max: 1,
                  bind: 'resource',
                  effects: [
                    {
                      kind: 'defeat-resource',
                      target: 'resource',
                    },
                  ],
                },
              ],
              otherwise: [
                {
                  kind: 'inspect-zone',
                  zone: 'resources',
                  player: 'self',
                  chooser: 'self',
                  filter: {
                    owner: 'self',
                  },
                  min: 1,
                  max: 1,
                  bind: 'resource',
                  effects: [
                    {
                      kind: 'defeat-resource',
                      target: 'resource',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 4,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 2,
      hp: 5,
      arena: 'ground',
      actions: [
        {
          id: 'smuggle',
          costs: [],
          limit: 'once-per-round',
          effects: [
            {
              kind: 'play-card',
              from: 'resources',
              using: 'smuggle',
              filter: {},
              discount: 2,
              optional: false,
              beforePlayed: [
                {
                  kind: 'inspect-zone',
                  zone: 'resources',
                  player: 'self',
                  chooser: 'self',
                  filter: {
                    owner: 'self',
                  },
                  min: 1,
                  max: 1,
                  bind: 'resource',
                  effects: [
                    {
                      kind: 'defeat-resource',
                      target: 'resource',
                    },
                  ],
                },
              ],
              otherwise: [
                {
                  kind: 'inspect-zone',
                  zone: 'resources',
                  player: 'self',
                  chooser: 'self',
                  filter: {
                    owner: 'self',
                  },
                  min: 1,
                  max: 1,
                  bind: 'resource',
                  effects: [
                    {
                      kind: 'defeat-resource',
                      target: 'resource',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
