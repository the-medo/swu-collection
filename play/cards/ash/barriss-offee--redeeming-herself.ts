import type { UnitDefinition } from '../definition.ts';

// ASH 044. Printed text is pinned in meta-board fixture.
export const barrissOffeeRedeemingHerself = {
  cardId: 'barriss-offee--redeeming-herself',
  name: 'Barriss Offee, Redeeming Herself',
  kind: 'unit',
  aspects: ['Vigilance', 'Cunning'],
  traits: ['Force', 'Fringe'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {},
          optional: false,
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'heal-0',
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
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'give-token',
                            token: 'advantage',
                            count: {
                              kind: 'value',
                              name: 'healed',
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'heal-1',
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
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'give-token',
                            token: 'advantage',
                            count: {
                              kind: 'value',
                              name: 'healed',
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'heal-2',
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
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'give-token',
                            token: 'advantage',
                            count: {
                              kind: 'value',
                              name: 'healed',
                            },
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
  ],
} as const satisfies UnitDefinition;
