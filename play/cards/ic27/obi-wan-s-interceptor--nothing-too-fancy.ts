import { ic27Unit } from './define.ts';

export const ic27ObiWanSInterceptorNothingTooFancy = ic27Unit(
  'obi-wan-s-interceptor--nothing-too-fancy',
  {
    auras: [
      {
        id: 'republic-hp',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          trait: 'Republic',
        },
        hp: 1,
      },
    ],
  },
);
