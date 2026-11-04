import { ic27Unit } from './define.ts';

export const ic27DevastatorLordVaderSFlagship = ic27Unit('devastator--lord-vader-s-flagship', {
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 5,
          filter: 'unit',
          cardFilter: {
            aspect: 'Villainy',
            maxCost: 12,
          },
          max: 1,
          play: {
            discount: 0,
            free: true,
          },
        },
      ],
    },
  ],
});
