import { hmwUnit } from './define.ts';

export const hmwGeneralGrievousScourgeOfDathomir = hmwUnit(
  'general-grievous--scourge-of-dathomir',
  {
    triggers: [
      {
        id: 'played',
        timing: 'played',
        effects: [
          {
            kind: 'damage-base',
            amount: 4,
          },
        ],
      },
    ],
    preventBaseHealing: true,
  },
);
