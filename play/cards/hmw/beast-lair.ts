import { hmwUpgrade } from './define.ts';

export const hmwBeastLair = hmwUpgrade('beast-lair', {
  grants: {
    triggers: [
      {
        id: 'action-start',
        timing: 'action-start',
        effects: [
          {
            kind: 'pay',
            costs: [
              {
                kind: 'discard-hand',
                count: 1,
              },
            ],
            optional: false,
            effects: [
              {
                kind: 'create-unit',
                cardId: 'beast',
                count: 1,
              },
            ],
          },
        ],
      },
    ],
  },
});
