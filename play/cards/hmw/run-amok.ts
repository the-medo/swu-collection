import { hmwEvent } from './define.ts';

export const hmwRunAmok = hmwEvent('run-amok', [
  {
    kind: 'create-unit',
    cardId: 'beast',
    count: 1,
  },
  {
    kind: 'select-unit',
    filter: {
      controller: 'friendly',
      arena: 'ground',
    },
    bind: 'friendly',
    optional: false,
    effects: [
      {
        kind: 'select-unit',
        filter: {
          controller: 'enemy',
          arena: 'ground',
        },
        bind: 'chosen',
        optional: false,
        effects: [
          {
            kind: 'damage-bound',
            targets: ['friendly', 'chosen'],
            amount: 1,
          },
        ],
        allowMissing: true,
      },
    ],
    allowMissing: true,
  },
]);
