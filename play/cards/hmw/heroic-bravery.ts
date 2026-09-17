import { hmwUpgrade } from './define.ts';

export const hmwHeroicBravery = hmwUpgrade('heroic-bravery', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'attached',
            filter: {
              anyAspect: ['Heroism'],
            },
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'attached',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
});
