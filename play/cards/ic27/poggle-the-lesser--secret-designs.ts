import { ic27Unit } from './define.ts';

export const ic27PoggleTheLesserSecretDesigns = ic27Unit('poggle-the-lesser--secret-designs', {
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'discard-hand',
              count: 1,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'next-play',
              filter: {},
              discount: 3,
            },
          ],
        },
      ],
    },
  ],
});
