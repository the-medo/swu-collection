import type { LeaderDefinition } from '../definition.ts';

// Both printed faces and official clarifications are pinned in leader-plays.json.
export const landoCalrissianBuyingTime = {
  cardId: 'lando-calrissian--buying-time',
  name: 'Lando Calrissian, Buying Time',
  kind: 'leader',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel', 'Official', 'Pilot'],
  unique: true,
  printedCost: 7,
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
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'unit',
              },
              optional: false,
              effects: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'all',
                    conditions: [
                      {
                        kind: 'units-at-least',
                        filter: {
                          controller: 'friendly',
                          arena: 'ground',
                        },
                        amount: 1,
                      },
                      {
                        kind: 'units-at-least',
                        filter: {
                          controller: 'friendly',
                          arena: 'space',
                        },
                        amount: 1,
                      },
                    ],
                  },
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {},
                      bind: 'chosen',
                      optional: false,
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'give-token',
                            token: 'shield',
                            count: 1,
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
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 7,
              },
              as: 'unit-or-upgrade',
            },
          ],
        },
      ],
    },
    unit: {
      power: 5,
      hp: 7,
      arena: 'ground',
      keywords: ['Sentinel'],
    },
    upgrade: {
      modifiers: {
        power: 5,
        hp: 5,
      },
      attachTo: 'friendly-vehicle-without-pilot',
      hostIsLeader: true,
      grants: {
        keywords: ['Sentinel'],
      },
      triggers: [
        {
          id: 'deployed',
          timing: 'deployed',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                differentArenaFrom: 'source',
              },
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'shield',
                    count: 1,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
