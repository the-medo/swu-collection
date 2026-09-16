import { hmwUnit } from './define.ts';

export const hmwRhoMedicalShuttle = hmwUnit('rho-medical-shuttle', {
  triggers: [
    {
      id: 'played-heal',
      timing: 'played',
      effects: [
        {
          kind: 'select-target',
          units: {
            otherThan: 'source',
          },
          bases: 'any',
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'heal-target',
              target: 'chosen',
              amount: 1,
            },
          ],
        },
      ],
    },
    {
      id: 'attack-heal',
      timing: 'attack',
      effects: [
        {
          kind: 'select-target',
          units: {
            otherThan: 'source',
          },
          bases: 'any',
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'heal-target',
              target: 'chosen',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
});
