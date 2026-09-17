import { hmwUnit } from './define.ts';

export const hmwMiningGuildTrespasser = hmwUnit('mining-guild-trespasser', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-target',
          bases: 'any',
          bind: 'base',
          optional: false,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'damage-bound',
                  targets: ['base', 'chosen'],
                  amount: 2,
                },
              ],
              allowMissing: true,
            },
          ],
        },
      ],
      optional: true,
    },
  ],
});
