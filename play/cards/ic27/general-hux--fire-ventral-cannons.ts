import { ic27Unit } from './define.ts';

export const ic27GeneralHuxFireVentralCannons = ic27Unit('general-hux--fire-ventral-cannons', {
  keywords: ['Overwhelm'],
  auras: [
    {
      id: 'first-order-bonus',
      filter: {
        controller: 'friendly',
        otherThan: 'source',
        trait: 'First Order',
      },
      power: 1,
      abilities: {
        keywords: ['Overwhelm'],
      },
    },
  ],
});
