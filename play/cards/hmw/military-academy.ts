import { hmwUpgrade } from './define.ts';

export const hmwMilitaryAcademy = hmwUpgrade('military-academy', {
  grants: {
    auras: [
      {
        id: 'overwhelm',
        filter: {
          controller: 'friendly',
        },
        abilities: {
          keywords: ['Overwhelm'],
        },
      },
    ],
  },
});
