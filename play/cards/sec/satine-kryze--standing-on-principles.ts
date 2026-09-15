import type { LeaderDefinition } from '../definition.ts';

// Both printed faces and official clarifications are pinned in leader-plays.json.
export const satineKryzeStandingOnPrinciples = {
  cardId: 'satine-kryze--standing-on-principles',
  name: 'Satine Kryze, Standing on Principles',
  kind: 'leader',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Mandalorian', 'Official'],
  unique: true,
  printedCost: 5,
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
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'heal-0-damage',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'heal',
                            amount: 0,
                            countAs: 'healed',
                          },
                          ifYouDo: [
                            {
                              kind: 'damage-own-base',
                              amount: {
                                kind: 'value',
                                name: 'healed',
                              },
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: 'heal-1-damage',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'heal',
                            amount: 1,
                            countAs: 'healed',
                          },
                          ifYouDo: [
                            {
                              kind: 'damage-own-base',
                              amount: {
                                kind: 'value',
                                name: 'healed',
                              },
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: 'heal-2-damage',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'heal',
                            amount: 2,
                            countAs: 'healed',
                          },
                          ifYouDo: [
                            {
                              kind: 'damage-own-base',
                              amount: {
                                kind: 'value',
                                name: 'healed',
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
                amount: 5,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 0,
      hp: 8,
      arena: 'ground',
      restore: 4,
    },
  },
} as const satisfies LeaderDefinition;
