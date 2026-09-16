import { hmwUnit } from './define.ts';

export const hmwArenaAcklayScreamingPredator = hmwUnit('arena-acklay--screaming-predator', {
  triggers: [
    {
      id: 'survived-damage',
      timing: 'friendly-damage-survived',
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          sameAs: 'source',
        },
      },
      effects: [
        {
          kind: 'damage-bases',
          amount: 2,
          targets: 'enemy',
        },
      ],
    },
  ],
});
