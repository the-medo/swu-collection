import { ic27Unit } from './define.ts';

export const ic27TheInquisitorSTieWouldRatherWin = ic27Unit(
  'the-inquisitor-s-tie--would-rather-win',
  {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'each-player-discards',
            count: 1,
            handSizeAtLeast: 4,
          },
        ],
      },
    ],
  },
);
