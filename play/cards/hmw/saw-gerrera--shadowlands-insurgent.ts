import { hmwUnit } from './define.ts';

export const hmwSawGerreraShadowlandsInsurgent = hmwUnit('saw-gerrera--shadowlands-insurgent', {
  triggers: [
    {
      id: 'enemy-card-played',
      timing: 'enemy-card-played',
      effects: [
        {
          kind: 'resource-top',
          optional: false,
        },
      ],
      condition: {
        kind: 'card-matches',
        target: 'subject',
        filter: {
          kind: 'event',
        },
      },
    },
  ],
});
