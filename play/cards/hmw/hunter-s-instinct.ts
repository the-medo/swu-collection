import { hmwUpgrade } from './define.ts';

export const hmwHunterSInstinct = hmwUpgrade('hunter-s-instinct', {
  grantsIf: {
    trait: 'Creature',
  },
  grants: {
    keywords: ['Grit'],
  },
});
