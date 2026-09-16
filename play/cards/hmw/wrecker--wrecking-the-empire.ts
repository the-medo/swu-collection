import { hmwUnit } from './define.ts';

export const hmwWreckerWreckingTheEmpire = hmwUnit('wrecker--wrecking-the-empire', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          bind: 'own',
          allowMissing: true,
          optional: false,
          effects: [
            {
              kind: 'select-unit',
              chooser: 'enemy',
              filter: {
                controller: 'enemy',
              },
              bind: 'enemy',
              allowMissing: true,
              optional: false,
              effects: [
                {
                  kind: 'damage-bound',
                  targets: ['own', 'enemy'],
                  amount: 3,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
