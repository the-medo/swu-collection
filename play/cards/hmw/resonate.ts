import { hmwEvent } from './define.ts';

export const hmwResonate = hmwEvent('resonate', [
  {
    kind: 'if',
    condition: {
      kind: 'units-at-least',
      filter: {
        controller: 'friendly',
        nonLeader: true,
        sharesFriendlyLeaderTrait: true,
      },
      amount: 1,
    },
    effects: [
      {
        kind: 'select-target',
        units: {},
        bases: 'any',
        bind: 'chosen',
        optional: false,
        effects: [
          {
            kind: 'heal-target',
            target: 'chosen',
            amount: 4,
          },
        ],
      },
    ],
  },
]);
