import { hmwUnit } from './define.ts';

export const hmwBlockadeShip = hmwUnit('blockade-ship', {
  keywords: ['Sentinel'],
  auras: [
    {
      id: 'ground-attackers',
      filter: {
        controller: 'enemy',
        arena: 'ground',
        attacking: 'any',
      },
      power: -1,
    },
  ],
});
