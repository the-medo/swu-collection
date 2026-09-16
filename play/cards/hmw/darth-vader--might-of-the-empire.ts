import { hmwLeader } from './define.ts';

export const hmwDarthVaderMightOfTheEmpire = hmwLeader('darth-vader--might-of-the-empire', {
  leader: {
    auras: [
      {
        id: 'raid',
        filter: {
          controller: 'friendly',
          minCost: 3,
        },
        abilities: {
          raid: 1,
        },
      },
    ],
  },
  unit: {
    raid: 1,
    auras: [
      {
        id: 'raid',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          minCost: 3,
        },
        abilities: {
          raid: 1,
        },
      },
    ],
  },
});
