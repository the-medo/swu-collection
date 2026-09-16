import { hmwEvent } from './define.ts';

export const hmwTorrent = hmwEvent('torrent', [
  {
    kind: 'select-unit',
    filter: {},
    bind: 'chosen',
    optional: false,
    effects: [
      {
        kind: 'on-unit',
        target: 'chosen',
        operation: {
          kind: 'give-token',
          token: 'weakness',
          count: {
            kind: 'conditional',
            condition: {
              kind: 'controls-base-trait',
              trait: 'Naboo',
            },
            then: 2,
            otherwise: 1,
          },
        },
      },
    ],
  },
]);
