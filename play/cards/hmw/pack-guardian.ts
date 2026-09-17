import { hmwUnit } from './define.ts';

export const hmwPackGuardian = hmwUnit('pack-guardian', {
  constant: [
    {
      condition: {
        kind: 'card-ready',
        target: 'source',
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
});
