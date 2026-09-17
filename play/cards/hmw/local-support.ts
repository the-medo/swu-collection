import { hmwUpgrade } from './define.ts';

export const hmwLocalSupport = hmwUpgrade('local-support', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'reveal-top',
          player: 'self',
          bind: 'revealed',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'card-matches',
                target: 'revealed',
                filter: {
                  sharesFriendlyUnitTrait: true,
                },
              },
              effects: [
                {
                  kind: 'draw-card',
                  target: 'revealed',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
