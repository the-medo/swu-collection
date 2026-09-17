import { hmwUpgrade } from './define.ts';

export const hmwDireProwess = hmwUpgrade('dire-prowess', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
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
