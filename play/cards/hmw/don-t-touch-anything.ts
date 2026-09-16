import { hmwEvent } from './define.ts';

export const hmwDontTouchAnything = hmwEvent('don-t-touch-anything', [
  {
    kind: 'random-card',
    units: { controller: 'enemy' },
    bind: 'random-enemy',
    effects: [{ kind: 'damage-target', target: 'random-enemy', amount: 3 }],
  },
]);
