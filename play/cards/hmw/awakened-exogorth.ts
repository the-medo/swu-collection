import { hmwUnit } from './define.ts';

export const hmwAwakenedExogorth = hmwUnit('awakened-exogorth', {
  keywords: ['Hidden'],
  auras: [
    {
      id: 'terrifying-attacker',
      filter: {
        defendingAgainst: {
          sameAs: 'source',
        },
      },
      power: -3,
    },
  ],
});
