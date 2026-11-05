import { ic27Unit } from './define.ts';

export const ic27CountDookuSilverTongued = ic27Unit('count-dooku--silver-tongued', {
  enemyRegroupReadyLimit: 1,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
  ],
});
