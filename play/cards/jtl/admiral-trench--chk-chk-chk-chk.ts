import type { LeaderDefinition } from '../definition.ts';

// Separate costs and entry roles follow the pinned official leader-deployment fixture.
export const admiralTrenchChkChkChkChk = {
  cardId: 'admiral-trench--chk-chk-chk-chk',
  name: 'Admiral Trench, Chk-chk-chk-chk',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Separatist', 'Official'],
  unique: true,
  printedCost: 6,
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
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'self',
              chooser: 'self',
              filter: {
                minCost: 3,
              },
              min: 1,
              max: 1,
              bind: 'chosen',
              effects: [
                {
                  kind: 'move-card',
                  target: 'chosen',
                  from: 'hand',
                  to: 'discard',
                  effects: [
                    {
                      kind: 'draw-cards',
                      amount: 1,
                      player: 'self',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'deploy',
          costs: [
            {
              kind: 'resources',
              amount: 3,
            },
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'deploy',
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 6,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 5,
      arena: 'ground',
      triggers: [
        {
          id: 'deployment-reveal',
          timing: 'deployed',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'deck',
              player: 'self',
              chooser: 'enemy',
              filter: {},
              min: 2,
              max: 2,
              bind: 'chosen',
              effects: [
                {
                  kind: 'move-cards',
                  group: 'discarded',
                  from: 'deck',
                  to: 'discard',
                  discardBy: 'enemy',
                },
              ],
              top: 4,
              reveal: true,
              group: 'discarded',
              after: [
                {
                  kind: 'inspect-zone',
                  zone: 'deck',
                  player: 'self',
                  chooser: 'self',
                  filter: {},
                  min: 1,
                  max: 1,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'draw-card',
                      target: 'chosen',
                    },
                  ],
                  top: 2,
                  after: [
                    {
                      kind: 'mill',
                      player: 'self',
                      count: 1,
                      bind: 'last',
                      effects: [],
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
