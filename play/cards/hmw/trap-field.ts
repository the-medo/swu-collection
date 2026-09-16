import { hmwUpgrade } from './define.ts';

export const hmwTrapField = hmwUpgrade('trap-field', {
  triggers: [
    {
      id: 'entered',
      timing: 'unit-entered',
      optional: true,
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: { arena: 'ground', nonLeader: true },
      },
      effects: [
        { kind: 'defeat-self-upgrade' },
        { kind: 'damage-target', target: 'subject', amount: 3 },
      ],
    },
  ],
});
