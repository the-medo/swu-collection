import { hmwUnit } from './define.ts';

export const hmwRadiantViiNegotiatingForNaboo = hmwUnit('radiant-vii--negotiating-for-naboo', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      optional: true,
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'damage',
            amount: 3,
          },
          ifYouDo: [
            {
              kind: 'give-self-token',
              token: 'shield',
            },
          ],
        },
      ],
    },
  ],
});
