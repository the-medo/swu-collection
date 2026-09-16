import { hmwUnit } from './define.ts';

export const hmwBabwaVenomorBurningKashyyyk = hmwUnit('babwa-venomor--burning-kashyyyk', {
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'beast',
          count: 1,
          player: 'enemy',
        },
      ],
    },
  ],
});
