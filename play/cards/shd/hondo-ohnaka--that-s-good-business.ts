import type { LeaderDefinition } from '../definition.ts';

// Official face text is pinned in leader-smuggle.json.
export const hondoOhnakaThatSGoodBusiness = {
  cardId: 'hondo-ohnaka--that-s-good-business',
  name: "Hondo Ohnaka, That's Good Business",
  kind: 'leader',
  aspects: ['Villainy', 'Command'],
  traits: ['Underworld'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      triggers: [
        {
          id: 'smuggle-experience',
          timing: 'friendly-card-played',
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'value',
              name: 'played-using-smuggle',
            },
            amount: 1,
          },
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
                        count: 1,
                        token: 'experience',
                      },
                    },
                  ],
                },
              ],
            },
          ],
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
                amount: 6,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 7,
      arena: 'ground',
      raid: 1,
      triggers: [
        {
          id: 'smuggle-experience',
          timing: 'friendly-card-played',
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'value',
              name: 'played-using-smuggle',
            },
            amount: 1,
          },
          optional: true,
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
                    count: 1,
                    token: 'experience',
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
