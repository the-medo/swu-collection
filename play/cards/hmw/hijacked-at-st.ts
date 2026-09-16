import { hmwUnit } from './define.ts';

export const hmwHijackedAtSt = hmwUnit('hijacked-at-st', {
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            skipRegroupReady: true,
            duration: 'next-regroup',
          },
        },
      ],
    },
  ],
});
