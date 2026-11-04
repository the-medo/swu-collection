import { ic27Unit } from './define.ts';

export const ic27TheInvisibleHandConfederateMight = ic27Unit(
  'the-invisible-hand--confederate-might',
  {
    triggers: [
      {
        id: 'played',
        timing: 'played',
        effects: [
          {
            kind: 'next-play',
            filter: {},
            discount: 9,
          },
        ],
      },
      {
        id: 'defeated',
        timing: 'defeated',
        effects: [
          {
            kind: 'next-play',
            filter: {},
            discount: 9,
          },
        ],
      },
    ],
  },
);
