import { hmwUnit } from './define.ts';

export const hmwL337WereProgrammedToLearn = hmwUnit('l3-37--we-re-programmed-to-learn', {
  triggers: [
    {
      id: 'replay-event',
      timing: 'friendly-card-played',
      limit: 'once-per-phase',
      optional: true,
      condition: {
        kind: 'card-matches',
        target: 'subject',
        filter: { kind: 'event', maxCost: 3 },
      },
      effects: [
        {
          kind: 'play-card',
          from: 'discard',
          target: 'subject',
          filter: {},
          optional: false,
          free: true,
        },
      ],
    },
  ],
});
