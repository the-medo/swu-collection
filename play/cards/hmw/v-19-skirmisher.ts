import { hmwUnit } from './define.ts';

export const hmwV19Skirmisher = hmwUnit('v-19-skirmisher', {
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
        },
        amount: 3,
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
});
