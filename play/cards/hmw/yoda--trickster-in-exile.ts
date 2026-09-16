import { hmwUnit } from './define.ts';

export const hmwYodaTricksterInExile = hmwUnit('yoda--trickster-in-exile', {
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      optional: true,
      effects: [
        {
          kind: 'move-card',
          target: 'source',
          from: 'discard',
          to: 'deck-top',
          effects: [
            {
              kind: 'heal-own-base',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
});
