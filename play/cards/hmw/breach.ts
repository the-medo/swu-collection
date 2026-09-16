import { hmwEvent } from './define.ts';

export const hmwBreach = hmwEvent('breach', [
  {
    kind: 'select-unit',
    filter: { controller: 'friendly' },
    bind: 'dealer',
    optional: false,
    effects: [
      {
        kind: 'select-unit',
        filter: { controller: 'enemy', sameArenaAs: 'dealer' },
        bind: 'target',
        optional: false,
        effects: [
          {
            kind: 'damage-target',
            source: 'dealer',
            target: 'target',
            amount: { kind: 'unit-stat', target: 'dealer', stat: 'power' },
            excessToEnemyBase: true,
          },
        ],
      },
    ],
  },
]);
