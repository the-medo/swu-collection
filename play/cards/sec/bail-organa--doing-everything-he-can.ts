import type { LeaderDefinition } from '../definition.ts';

// Separate costs and entry roles follow the pinned official leader-deployment fixture.
export const bailOrganaDoingEverythingHeCan = {
  cardId: 'bail-organa--doing-everything-he-can',
  name: 'Bail Organa, Doing Everything He Can',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Republic', 'Official'],
  unique: true,
  printedCost: 4,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'friendly-unit-defeated',
              },
              effects: [
                {
                  kind: 'inspect-zone',
                  zone: 'resources',
                  player: 'self',
                  chooser: 'self',
                  filter: {},
                  min: 1,
                  max: 1,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'move-card',
                      target: 'chosen',
                      from: 'resources',
                      to: 'hand',
                      effects: [
                        {
                          kind: 'resource-top',
                          optional: false,
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
          id: 'deploy',
          costs: [
            {
              kind: 'exhaust-self',
            },
            {
              kind: 'discard-hand',
              count: 2,
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'deploy',
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 4,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 3,
      arena: 'ground',
      triggers: [
        {
          id: 'resource-play-heal',
          timing: 'friendly-card-played',
          condition: {
            kind: 'value-at-least',
            name: 'played-from-resources',
            amount: 1,
          },
          effects: [
            {
              kind: 'heal-own-base',
              amount: 1,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
