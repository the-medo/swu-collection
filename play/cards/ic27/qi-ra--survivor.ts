import { ic27Unit } from './define.ts';

export const ic27QiRaSurvivor = ic27Unit('qi-ra--survivor', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: 2,
          },
        },
      ],
    },
    {
      id: 'defeated',
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
                kind: 'give-token',
                token: 'experience',
                count: {
                  kind: 'upgrades-count',
                  target: 'source',
                  cardId: 'experience',
                  lastKnown: true,
                },
              },
            },
          ],
        },
      ],
    },
  ],
});
