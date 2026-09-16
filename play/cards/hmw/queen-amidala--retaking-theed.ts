import { hmwUnit } from './define.ts';

export const hmwQueenAmidalaRetakingTheed = hmwUnit('queen-amidala--retaking-theed', {
  restore: 2,
  costReductions: [
    {
      condition: {
        kind: 'own-base-upgraded',
      },
      amount: 2,
    },
  ],
});
