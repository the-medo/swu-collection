import { hmwUnit } from './define.ts';

export const hmwInfernoSquadWeCanGrieveLater = hmwUnit('inferno-squad--we-can-grieve-later', {
  triggers: [
    {
      id: 'played-weakness',
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
                kind: 'damage',
                amount: 1,
              },
              ifYouDo: [
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
    {
      id: 'defeated-weakness',
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
                kind: 'damage',
                amount: 1,
              },
              ifYouDo: [
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
  ],
});
