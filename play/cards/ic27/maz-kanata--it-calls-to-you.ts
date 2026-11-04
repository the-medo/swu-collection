import { ic27Unit } from './define.ts';

export const ic27MazKanataItCallsToYou = ic27Unit('maz-kanata--it-calls-to-you', {
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'card-resourced',
      timing: 'card-resourced',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: 1,
          },
        },
      ],
    },
  ],
});
