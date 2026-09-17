import { hmwUnit } from './define.ts';

export const hmwChildOfDathomir = hmwUnit('child-of-dathomir', {
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
        },
        amount: 3,
      },
      power: 2,
    },
  ],
});
