import { hmwUnit } from './define.ts';

export const hmwEzraBridgerWhatAreYouAfraidOf = hmwUnit('ezra-bridger--what-are-you-afraid-of-', {
  triggers: [
    {
      id: 'initiative',
      timing: 'initiative-taken',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'damage-own-base',
              amount: 3,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'create-unit',
              cardId: 'beast',
              count: 1,
            },
          ],
        },
      ],
    },
  ],
});
