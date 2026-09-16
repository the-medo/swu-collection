import { hmwUnit } from './define.ts';

export const hmwLeiaOrganaTheseAreMyFriends = hmwUnit('leia-organa--these-are-my-friends', {
  triggers: [
    {
      id: 'friendly-played',
      timing: 'friendly-played',
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          maxCost: 3,
        },
      },
      effects: [
        {
          kind: 'heal-own-base',
          amount: 1,
        },
      ],
    },
  ],
});
