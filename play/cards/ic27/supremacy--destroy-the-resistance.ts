import { ic27Unit } from './define.ts';

export const ic27SupremacyDestroyTheResistance = ic27Unit('supremacy--destroy-the-resistance', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-target',
          bases: 'any',
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: {
                kind: 'floor-divide',
                value: {
                  kind: 'unit-stat',
                  target: 'chosen',
                  stat: 'remaining-hp',
                },
                divisor: 2,
              },
            },
          ],
        },
      ],
    },
  ],
});
