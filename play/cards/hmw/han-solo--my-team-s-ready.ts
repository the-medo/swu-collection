import { hmwUnit } from './define.ts';

export const hmwHanSoloMyTeamSReady = hmwUnit('han-solo--my-team-s-ready', {
  actions: [
    {
      id: 'ready-unit',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
});
