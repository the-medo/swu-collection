import { ic27Unit } from './define.ts';

export const ic27KyloSTieSilencerFollowMyLead = ic27Unit('kylo-s-tie-silencer--follow-my-lead', {
  restore: 1,
  triggers: [
    {
      id: 'discarded',
      timing: 'discarded',
      effects: [
        {
          kind: 'grant-discard-play',
          target: 'source',
          player: 'self',
          free: false,
        },
      ],
      condition: {
        kind: 'discarded-from-hand',
        target: 'source',
      },
    },
  ],
});
