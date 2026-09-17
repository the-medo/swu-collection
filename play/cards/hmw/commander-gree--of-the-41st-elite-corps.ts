import { hmwUnit } from './define.ts';

export const hmwCommanderGreeOfThe41stEliteCorps = hmwUnit(
  'commander-gree--of-the-41st-elite-corps',
  {
    constant: [
      {
        condition: {
          kind: 'numeric-at-least',
          value: {
            kind: 'in-play-aspect-icons',
            aspect: 'Command',
            filter: {
              controller: 'friendly',
              roles: ['unit', 'upgrade'],
            },
          },
          amount: 3,
        },
        abilities: {
          raid: 4,
        },
      },
    ],
  },
);
