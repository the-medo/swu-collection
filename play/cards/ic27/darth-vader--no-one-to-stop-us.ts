import { ic27Leader } from './define.ts';

export const ic27DarthVaderNoOneToStopUs = ic27Leader('darth-vader--no-one-to-stop-us', {
  leader: {
    actions: [
      {
        id: 'action',
        costs: [
          {
            kind: 'resources',
            amount: 1,
          },
          {
            kind: 'exhaust-self',
          },
          {
            kind: 'defeat-friendly-unit',
          },
        ],
        limit: null,
        effects: [
          {
            kind: 'draw-cards',
            amount: 1,
          },
          {
            kind: 'heal-own-base',
            amount: 2,
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
            filter: {
              controller: 'friendly',
              otherThan: 'source',
            },
            bind: 'chosen',
            optional: true,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'defeat',
                },
                ifYouDo: [
                  {
                    kind: 'draw-cards',
                    amount: 1,
                  },
                  {
                    kind: 'heal-own-base',
                    amount: 2,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
});
