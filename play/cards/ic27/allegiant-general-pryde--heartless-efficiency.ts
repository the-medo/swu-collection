import { ic27Unit } from './define.ts';

export const ic27AllegiantGeneralPrydeHeartlessEfficiency = ic27Unit(
  'allegiant-general-pryde--heartless-efficiency',
  {
    triggers: [
      {
        id: 'defeated',
        timing: 'defeated',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              controller: 'friendly',
              mostPowerAmong: {
                controller: 'friendly',
              },
            },
            bind: 'chosen',
            optional: false,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'give-token',
                  token: 'experience',
                  count: 1,
                },
              },
            ],
          },
        ],
      },
    ],
  },
);
