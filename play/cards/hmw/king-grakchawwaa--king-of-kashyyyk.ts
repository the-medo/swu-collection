import { hmwUnit } from './define.ts';

export const hmwKingGrakchawwaaKingOfKashyyyk = hmwUnit('king-grakchawwaa--king-of-kashyyyk', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            controller: 'friendly',
            trait: 'Wookiee',
            otherThan: 'source',
          },
          bind: 'wookiee',
          effects: [
            {
              kind: 'resource-top',
              optional: false,
              ready: true,
            },
          ],
        },
      ],
    },
  ],
});
