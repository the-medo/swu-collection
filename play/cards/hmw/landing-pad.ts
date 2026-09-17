import { hmwUpgrade } from './define.ts';

export const hmwLandingPad = hmwUpgrade('landing-pad', {
  grants: {
    auras: [
      {
        id: 'space-support',
        filter: {
          controller: 'friendly',
          arena: 'space',
        },
        power: 1,
      },
    ],
  },
});
