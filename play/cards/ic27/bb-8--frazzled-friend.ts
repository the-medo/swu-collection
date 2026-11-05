import { ic27Unit } from './define.ts';

export const ic27Bb8FrazzledFriend = ic27Unit('bb-8--frazzled-friend', {
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          bind: 'chosen',
          optional: false,
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
                  kind: 'select-unit',
                  filter: {
                    controller: 'enemy',
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'damage',
                        amount: 1,
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
});
