import { hmwUnit } from './define.ts';

export const hmwLuminaraUnduliBesiegedGeneral = hmwUnit('luminara-unduli--besieged-general', {
  triggers: [
    {
      id: 'friendly-played',
      timing: 'friendly-played',
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          controller: 'friendly',
        },
      },
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
              powerBonus: 2,
            },
          ],
        },
      ],
    },
  ],
});
