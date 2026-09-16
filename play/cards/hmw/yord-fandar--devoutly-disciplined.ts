import { hmwUnit } from './define.ts';

export const hmwYordFandarDevoutlyDisciplined = hmwUnit('yord-fandar--devoutly-disciplined', {
  constant: [
    {
      condition: {
        kind: 'base-damage-at-least',
        amount: 15,
        player: 'any',
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
});
