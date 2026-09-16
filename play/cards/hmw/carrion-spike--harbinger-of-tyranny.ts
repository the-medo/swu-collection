import { hmwUnit } from './define.ts';

export const hmwCarrionSpikeHarbingerOfTyranny = hmwUnit('carrion-spike--harbinger-of-tyranny', {
  keywords: ['Shielded'],
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'base-upgrades-count',
        player: 'self',
      },
      restore: {
        kind: 'base-upgrades-count',
        player: 'self',
      },
    },
  ],
});
