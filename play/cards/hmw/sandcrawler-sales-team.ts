import { hmwUnit } from './define.ts';

export const hmwSandcrawlerSalesTeam = hmwUnit('sandcrawler-sales-team', {
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      condition: {
        kind: 'controls-base-trait',
        trait: 'Tatooine',
      },
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            maxCost: 3,
          },
          min: 0,
          max: 1,
          bind: 'chosen',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'chosen',
              to: 'hand',
            },
          ],
        },
      ],
    },
  ],
});
