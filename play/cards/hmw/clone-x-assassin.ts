import { hmwUnit } from './define.ts';

export const hmwCloneXAssassin = hmwUnit('clone-x-assassin', {
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
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
