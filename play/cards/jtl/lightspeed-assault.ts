import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const lightspeedAssault = {
  cardId: 'lightspeed-assault',
  name: 'Lightspeed Assault',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Gambit'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        arena: 'space',
      },
      bind: 'sacrificed',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'sacrificed',
          operation: {
            kind: 'defeat',
          },
          ifYouDo: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
                arena: 'space',
              },
              bind: 'enemy',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'enemy',
                  operation: {
                    kind: 'damage',
                    amount: {
                      kind: 'unit-stat',
                      target: 'sacrificed',
                      stat: 'power',
                    },
                  },
                  ifYouDo: [
                    {
                      kind: 'indirect-damage',
                      recipient: 'enemy',
                      amount: {
                        kind: 'unit-stat',
                        target: 'enemy',
                        stat: 'power',
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
} as const satisfies EventDefinition;
