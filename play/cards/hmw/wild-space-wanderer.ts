import { hmwUnit } from './define.ts';

export const hmwWildSpaceWanderer = hmwUnit('wild-space-wanderer', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            hostKind: 'base',
          },
          min: 0,
          max: 1,
          bind: 'upgrades',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'upgrades',
              to: 'discard',
            },
          ],
        },
      ],
    },
  ],
});
