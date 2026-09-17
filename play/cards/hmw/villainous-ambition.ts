import { hmwUpgrade } from './define.ts';

export const hmwVillainousAmbition = hmwUpgrade('villainous-ambition', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'attached',
            filter: {
              anyAspect: ['Villainy'],
            },
          },
          effects: [
            {
              kind: 'damage-unit',
              amount: 2,
              arena: 'any',
              optional: true,
            },
          ],
        },
      ],
    },
  ],
});
