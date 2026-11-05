import { ic27Unit } from './define.ts';

export const ic27PoeDameronHeroOfTheResistance = ic27Unit('poe-dameron--hero-of-the-resistance', {
  triggers: [
    {
      id: 'friendly-card-played',
      timing: 'friendly-card-played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'modify',
            power: 1,
            hp: 0,
            duration: 'phase',
          },
        },
      ],
      excludeSelf: true,
      condition: {
        kind: 'card-matches',
        target: 'subject',
        filter: {
          trait: 'Resistance',
        },
      },
    },
  ],
});
