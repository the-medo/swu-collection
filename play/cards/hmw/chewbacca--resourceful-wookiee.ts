import { hmwUnit } from './define.ts';

export const hmwChewbaccaResourcefulWookiee = hmwUnit('chewbacca--resourceful-wookiee', {
  constant: [
    {
      condition: {
        kind: 'always',
      },
      raid: {
        kind: 'difference',
        left: {
          kind: 'zone-size',
          zone: 'resources',
          player: 'self',
        },
        right: {
          kind: 'ready-resources',
          player: 'self',
        },
      },
    },
    {
      condition: {
        kind: 'numeric-equal',
        left: {
          kind: 'ready-resources',
          player: 'self',
        },
        right: 0,
      },
      abilities: {
        keywords: ['Overwhelm'],
      },
    },
  ],
});
