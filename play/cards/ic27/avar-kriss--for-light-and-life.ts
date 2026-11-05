import { ic27Unit } from './define.ts';

export const ic27AvarKrissForLightAndLife = ic27Unit('avar-kriss--for-light-and-life', {
  raid: 1,
  constant: [
    {
      condition: {
        kind: 'always',
      },
      raid: {
        kind: 'unit-count',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
        },
      },
    },
  ],
});
