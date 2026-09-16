import { hmwUpgrade } from './define.ts';

export const hmwIntelligenceAgency = hmwUpgrade('intelligence-agency', {
  grants: {
    lookAtDeckTop: true,
  },
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'self',
          filter: {},
          min: 0,
          max: 1,
          bind: 'discarded',
          effects: [
            {
              kind: 'move-card',
              target: 'discarded',
              from: 'hand',
              to: 'discard',
              discardBy: 'owner',
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                  player: 'enemy',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
