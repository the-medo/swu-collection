import { hmwUnit } from './define.ts';

export const hmwVenomousWyyyshokk = hmwUnit('venomous-wyyyshokk', {
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            damaged: true,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'weakness',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
});
