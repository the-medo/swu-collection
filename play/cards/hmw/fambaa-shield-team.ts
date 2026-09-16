import { hmwUnit } from './define.ts';

export const hmwFambaaShieldTeam = hmwUnit('fambaa-shield-team', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            controller: 'friendly',
            arena: 'ground',
            withoutUpgrade: 'shield',
          },
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
});
