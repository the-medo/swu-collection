import { ic27Unit } from './define.ts';

export const ic27BoKatanKryzeRightPlaceRightTime = ic27Unit(
  'bo-katan-kryze--right-place--right-time',
  {
    keywords: ['Shielded'],
    triggers: [
      {
        id: 'played',
        timing: 'played',
        effects: [
          {
            kind: 'modify-units',
            filter: {
              controller: 'enemy',
            },
            operation: {
              kind: 'modify',
              power: -7,
              hp: 0,
              duration: 'phase',
            },
          },
        ],
      },
    ],
  },
);
