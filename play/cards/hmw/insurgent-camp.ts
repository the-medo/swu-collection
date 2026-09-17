import { hmwUpgrade } from './define.ts';

export const hmwInsurgentCamp = hmwUpgrade('insurgent-camp', {
  triggers: [
    {
      id: 'friendly-played',
      timing: 'friendly-played',
      condition: { kind: 'unit-matches', target: 'subject', filter: { powerAtMost: 3 } },
      optional: true,
      effects: [
        {
          kind: 'select-upgrades',
          filter: { sameAs: 'source' },
          min: 'all',
          max: 'all',
          bind: 'camp',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'camp',
              to: 'discard',
              effects: [{ kind: 'on-unit', target: 'subject', operation: { kind: 'ready' } }],
            },
          ],
        },
      ],
    },
  ],
});
