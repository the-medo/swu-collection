import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const youReAllClearKid = {
  cardId: 'you-re-all-clear--kid',
  name: "You're All Clear, Kid",
  kind: 'event',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Gambit'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
        arena: 'space',
        remainingHpAtMost: 3,
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'defeat',
          },
          ifYouDo: [
            {
              kind: 'if',
              condition: {
                kind: 'units-at-most',
                filter: {
                  controller: 'enemy',
                  arena: 'space',
                },
                amount: 0,
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  bind: 'reward',
                  optional: true,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'reward',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
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
  ],
} as const satisfies EventDefinition;
