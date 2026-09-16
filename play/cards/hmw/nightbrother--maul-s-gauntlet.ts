import { hmwUnit } from './define.ts';

export const hmwNightbrotherMaulSGauntlet = hmwUnit('nightbrother--maul-s-gauntlet', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'play-card',
          from: 'discard',
          filter: {
            kind: 'unit',
          },
          discount: 3,
          ready: true,
          optional: true,
          bind: 'played',
          effects: [
            {
              kind: 'schedule-regroup-operation',
              target: 'played',
              operation: 'defeat',
            },
          ],
        },
      ],
    },
  ],
});
