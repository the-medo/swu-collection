import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const neverTellMeTheOdds = {
  cardId: 'never-tell-me-the-odds',
  name: 'Never Tell Me the Odds',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Gambit'],
  cost: 3,
  effects: [
    {
      kind: 'mill',
      player: 'enemy',
      count: 3,
      bind: 'enemy',
      group: 'enemy',
      effects: [
        {
          kind: 'mill',
          player: 'self',
          count: 3,
          bind: 'own',
          group: 'own',
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
                    kind: 'damage',
                    amount: {
                      kind: 'difference',
                      left: {
                        kind: 'zone-size',
                        zone: 'discard',
                        player: 'self',
                        filter: {
                          inGroup: 'own',
                          costParity: 'odd',
                        },
                      },
                      right: {
                        kind: 'difference',
                        left: 0,
                        right: {
                          kind: 'zone-size',
                          zone: 'discard',
                          player: 'enemy',
                          filter: {
                            inGroup: 'enemy',
                            costParity: 'odd',
                          },
                        },
                      },
                    },
                  },
                },
              ],
            },
          ],
          afterEvenIfEmpty: true,
        },
      ],
      afterEvenIfEmpty: true,
    },
  ],
} as const satisfies EventDefinition;
