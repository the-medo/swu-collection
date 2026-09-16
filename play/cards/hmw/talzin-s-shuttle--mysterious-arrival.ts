import { hmwUnit } from './define.ts';

export const hmwTalzinSShuttleMysteriousArrival = hmwUnit('talzin-s-shuttle--mysterious-arrival', {
  raid: 1,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      condition: {
        kind: 'cards-played-this-phase-at-least',
        player: 'enemy',
        amount: 2,
      },
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
                count: 2,
              },
            },
          ],
        },
      ],
    },
  ],
});
