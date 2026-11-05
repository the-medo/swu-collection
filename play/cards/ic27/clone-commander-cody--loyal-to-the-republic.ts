import { ic27Unit } from './define.ts';

export const ic27CloneCommanderCodyLoyalToTheRepublic = ic27Unit(
  'clone-commander-cody--loyal-to-the-republic',
  {
    triggers: [
      {
        id: 'friendly-entered',
        timing: 'friendly-entered',
        effects: [
          {
            kind: 'on-unit',
            target: 'subject',
            operation: {
              kind: 'give-token',
              token: 'experience',
              count: 1,
            },
          },
        ],
        excludeSelf: true,
        condition: {
          kind: 'unit-matches',
          target: 'subject',
          filter: {
            trait: 'Republic',
          },
        },
      },
    ],
  },
);
