import { ic27Unit } from './define.ts';

export const ic27JangoFettStraightShooter = ic27Unit('jango-fett--straight-shooter', {
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'discard-hand',
              count: 1,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'discard',
              player: 'self',
              chooser: 'self',
              filter: {
                kind: 'event',
              },
              min: 1,
              max: 1,
              bind: 'chosen',
              effects: [
                {
                  kind: 'move-card',
                  target: 'chosen',
                  from: 'discard',
                  to: 'hand',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
