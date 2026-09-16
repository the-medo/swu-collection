import { hmwLeader } from './define.ts';

export const hmwDoctorHemlockEmotionHasNoPlaceHere = hmwLeader(
  'doctor-hemlock--emotion-has-no-place-here',
  {
    leader: {
      actions: [
        {
          id: 'weakness',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                withoutUpgrade: 'weakness',
              },
              bind: 'chosen',
              optional: false,
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
    },
    unit: {
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
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
    },
  },
);
