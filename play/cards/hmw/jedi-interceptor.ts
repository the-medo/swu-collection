import { hmwUnit } from './define.ts';

export const hmwJediInterceptor = hmwUnit('jedi-interceptor', {
  constant: [
    {
      condition: {
        kind: 'numeric-at-least',
        value: {
          kind: 'zone-size',
          zone: 'resources',
          player: 'self',
        },
        amount: 6,
      },
      power: 2,
    },
  ],
});
