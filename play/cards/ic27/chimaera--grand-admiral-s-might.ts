import { ic27Unit } from './define.ts';

export const ic27ChimaeraGrandAdmiralSMight = ic27Unit('chimaera--grand-admiral-s-might', {
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            controller: 'friendly',
          },
          bind: 'unit',
          effects: [
            {
              kind: 'on-unit',
              target: 'unit',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: {
                  kind: 'upgrades-count',
                  target: 'unit',
                },
              },
            },
          ],
        },
        {
          kind: 'heal-own-base',
          amount: {
            kind: 'cards-in-play-count',
            filter: {
              controller: 'friendly',
              roles: ['upgrade'],
            },
          },
        },
      ],
    },
  ],
});
