import { hmwUnit } from './define.ts';

export const hmwVillageTroublemaker = hmwUnit('village-troublemaker', {
  constant: [
    {
      condition: {
        kind: 'controls-base-trait',
        trait: 'Endor',
      },
      abilities: {
        keywords: ['Hidden', 'Saboteur'],
      },
    },
  ],
});
