import { ic27Unit } from './define.ts';

export const ic27DexterJettsterObiWannnn = ic27Unit('dexter-jettster--obi-wannnn', {
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'look-deck',
              count: 3,
              mode: 'bottom-any',
            },
          ],
        },
      ],
    },
  ],
});
