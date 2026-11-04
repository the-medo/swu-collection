import { ic27Unit } from './define.ts';

export const ic27MonMothmaTruthIsAnAbyss = ic27Unit('mon-mothma--truth-is-an-abyss', {
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
          optional: true,
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
              evenIfExhausted: true,
              unitsOnly: true,
              abilities: {
                keywords: ['Overwhelm'],
              },
            },
          ],
          forAttack: {
            unitsOnly: true,
            evenIfExhausted: true,
          },
        },
      ],
    },
  ],
});
