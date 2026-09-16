import { hmwUnit } from './define.ts';

export const hmwDirectorKrennicTheWorkHasStalled = hmwUnit(
  'director-krennic--the-work-has-stalled',
  {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        condition: {
          kind: 'own-base-upgraded',
        },
        effects: [
          {
            kind: 'draw-cards',
            amount: 1,
          },
        ],
      },
    ],
  },
);
