import { hmwUnit } from './define.ts';

export const hmwMonCalCruiser = hmwUnit('mon-cal-cruiser', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'attack',
              effects: [
                {
                  kind: 'attack-with-unit',
                  powerBonus: 2,
                },
              ],
            },
            {
              id: 'inspect-hand',
              effects: [
                {
                  kind: 'inspect-zone',
                  zone: 'hand',
                  player: 'enemy',
                  chooser: 'self',
                  filter: {},
                  min: 0,
                  max: 1,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'move-card',
                      target: 'chosen',
                      from: 'hand',
                      to: 'discard',
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
        },
      ],
    },
  ],
});
