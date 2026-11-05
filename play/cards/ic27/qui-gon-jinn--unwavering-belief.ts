import { ic27Unit } from './define.ts';

export const ic27QuiGonJinnUnwaveringBelief = ic27Unit('qui-gon-jinn--unwavering-belief', {
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 2,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
});
