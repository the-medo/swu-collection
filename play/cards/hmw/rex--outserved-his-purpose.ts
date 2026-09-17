import { hmwUnit } from './define.ts';

export const hmwRexOutservedHisPurpose = hmwUnit('rex--outserved-his-purpose', {
  auras: [
    {
      id: 'veteran-guidance',
      filter: {
        controller: 'friendly',
        noAbilities: true,
      },
      power: 1,
      hp: 1,
    },
  ],
});
