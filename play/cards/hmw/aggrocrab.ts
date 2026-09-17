import { hmwUnit } from './define.ts';

export const hmwAggrocrab = hmwUnit('aggrocrab', {
  costReductions: [
    {
      condition: {
        kind: 'initiative',
      },
      amount: 1,
    },
  ],
});
