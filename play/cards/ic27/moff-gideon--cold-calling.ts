import { ic27Unit } from './define.ts';

export const ic27MoffGideonColdCalling = ic27Unit('moff-gideon--cold-calling', {
  costReductions: [
    {
      condition: {
        kind: 'friendly-unit-defeated',
      },
      amount: 2,
    },
  ],
});
