import { ic27Leader } from './define.ts';

export const ic27LukeSkywalkerIHaveToFaceHim = ic27Leader('luke-skywalker--i-have-to-face-him', {
  leader: {
    startingHandIncrease: 2,
  },
  unit: {
    keywords: ['Overwhelm'],
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'pay',
            costs: [
              {
                kind: 'discard-hand',
                count: 1,
              },
            ],
            optional: true,
            effects: [
              {
                kind: 'on-unit',
                target: 'source',
                operation: {
                  kind: 'modify',
                  power: 2,
                  hp: 0,
                  duration: 'attack',
                },
              },
            ],
          },
        ],
      },
    ],
  },
});
