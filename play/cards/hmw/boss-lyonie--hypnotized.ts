import { hmwUnit } from './define.ts';

export const hmwBossLyonieHypnotized = hmwUnit('boss-lyonie--hypnotized', {
  triggers: [
    {
      id: 'played-copy-token',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'source',
            upgraded: true,
          },
          bind: 'host',
          optional: true,
          effects: [
            {
              kind: 'select-upgrades',
              filter: {
                attachedTo: 'host',
                token: true,
              },
              min: 1,
              max: 1,
              bind: 'token',
              effects: [
                {
                  kind: 'copy-token',
                  upgrade: 'token',
                  target: 'host',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'attack-copy-token',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'source',
            upgraded: true,
          },
          bind: 'host',
          optional: true,
          effects: [
            {
              kind: 'select-upgrades',
              filter: {
                attachedTo: 'host',
                token: true,
              },
              min: 1,
              max: 1,
              bind: 'token',
              effects: [
                {
                  kind: 'copy-token',
                  upgrade: 'token',
                  target: 'host',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
