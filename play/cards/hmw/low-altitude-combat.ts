import { hmwEvent } from './define.ts';

export const hmwLowAltitudeCombat = hmwEvent('low-altitude-combat', [
  {
    kind: 'select-unit',
    filter: { arena: 'space' },
    bind: 'moved',
    optional: false,
    effects: [
      {
        kind: 'on-unit',
        target: 'moved',
        operation: { kind: 'move-arena', arena: 'ground' },
        ifYouDo: [
          {
            kind: 'select-unit',
            filter: { controller: 'friendly', arena: 'ground' },
            forAttack: {},
            bind: 'attacker',
            optional: true,
            effects: [{ kind: 'attack-bound', target: 'attacker', optional: false, powerBonus: 2 }],
          },
        ],
      },
    ],
  },
]);
