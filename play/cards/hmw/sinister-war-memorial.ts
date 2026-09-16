import { hmwUpgrade } from './define.ts';

export const hmwSinisterWarMemorial = hmwUpgrade('sinister-war-memorial', {
  grants: {
    triggers: [
      {
        id: 'friendly-defeated',
        timing: 'friendly-defeated',
        effects: [
          {
            kind: 'heal-own-base',
            amount: 1,
          },
        ],
      },
    ],
  },
});
