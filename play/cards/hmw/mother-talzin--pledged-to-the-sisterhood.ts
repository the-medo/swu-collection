import { hmwUnit } from './define.ts';

export const hmwMotherTalzinPledgedToTheSisterhood = hmwUnit(
  'mother-talzin--pledged-to-the-sisterhood',
  {
    raid: 1,
    auras: [
      {
        id: 'restore',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
        },
        abilities: {
          restore: 1,
        },
      },
    ],
  },
);
