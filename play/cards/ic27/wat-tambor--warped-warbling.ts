import { ic27Unit } from './define.ts';

export const ic27WatTamborWarpedWarbling = ic27Unit('wat-tambor--warped-warbling', {
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
            },
          ],
          forAttack: {},
        },
      ],
    },
  ],
});
