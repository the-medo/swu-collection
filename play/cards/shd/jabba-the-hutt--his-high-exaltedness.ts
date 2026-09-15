import type { LeaderDefinition } from '../definition.ts';

// Official text is pinned in leader-bounties.json.
export const jabbaTheHuttHisHighExaltedness = {
  cardId: 'jabba-the-hutt--his-high-exaltedness',
  name: 'Jabba the Hutt, His High Exaltedness',
  kind: 'leader',
  aspects: ['Villainy', 'Command'],
  traits: ['Underworld', 'Hutt'],
  unique: true,
  printedCost: 7,
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
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 0,
                    hp: 0,
                    duration: 'phase',
                    abilities: {
                      bounties: [
                        {
                          id: 'unit-discount',
                          effects: [
                            {
                              kind: 'next-play',
                              filter: {
                                kind: 'unit',
                              },
                              discount: 1,
                            },
                          ],
                        },
                      ],
                    },
                  },
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
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 2,
      hp: 12,
      arena: 'ground',
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
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 0,
                    hp: 0,
                    duration: 'phase',
                    abilities: {
                      bounties: [
                        {
                          id: 'unit-discount',
                          effects: [
                            {
                              kind: 'next-play',
                              filter: {
                                kind: 'unit',
                              },
                              discount: 2,
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
      triggers: [
        {
          id: 'capture',
          timing: 'deployed',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                otherThan: 'source',
              },
              bind: 'guard',
              optional: false,
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'enemy',
                    nonLeader: true,
                  },
                  bind: 'prey',
                  optional: false,
                  effects: [
                    {
                      kind: 'capture-unit',
                      guard: 'guard',
                      target: 'prey',
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
