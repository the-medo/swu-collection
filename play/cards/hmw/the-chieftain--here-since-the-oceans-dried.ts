import { hmwUnit } from './define.ts';

export const hmwTheChieftainHereSinceTheOceansDried = hmwUnit(
  'the-chieftain--here-since-the-oceans-dried',
  {
    constant: [
      {
        condition: {
          kind: 'always',
        },
        raid: {
          kind: 'unit-count',
          filter: {
            controller: 'friendly',
            trait: 'Tusken',
            otherThan: 'source',
          },
        },
      },
    ],
    auras: [
      {
        id: 'defending-tuskens',
        filter: {
          controller: 'friendly',
          trait: 'Tusken',
          defending: true,
        },
        power: {
          kind: 'keyword-count',
          target: 'recipient',
        },
      },
    ],
  },
);
