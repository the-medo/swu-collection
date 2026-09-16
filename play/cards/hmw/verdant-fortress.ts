import { hmwUpgrade } from './define.ts';

export const hmwVerdantFortress = hmwUpgrade('verdant-fortress', {
  grants: {
    auras: [
      {
        id: 'raid',
        filter: {
          controller: 'friendly',
        },
        abilities: {
          raid: 1,
        },
      },
    ],
  },
});
