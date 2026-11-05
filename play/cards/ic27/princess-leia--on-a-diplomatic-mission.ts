import { ic27Leader } from './define.ts';

export const ic27PrincessLeiaOnADiplomaticMission = ic27Leader(
  'princess-leia--on-a-diplomatic-mission',
  {
    leader: {
      actions: [
        {
          id: 'action',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
            },
            {
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'self',
              chooser: 'self',
              filter: {},
              min: 1,
              max: 1,
              bind: 'chosen',
              effects: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'deck-top',
                      effects: [
                        {
                          kind: 'move-card',
                          target: 'chosen',
                          from: 'hand',
                          to: 'deck-top',
                        },
                      ],
                    },
                    {
                      id: 'deck-bottom',
                      effects: [
                        {
                          kind: 'move-card',
                          target: 'chosen',
                          from: 'hand',
                          to: 'deck-bottom',
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
    unit: {
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
            },
            {
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'self',
              chooser: 'self',
              filter: {},
              min: 1,
              max: 1,
              bind: 'chosen',
              effects: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'deck-top',
                      effects: [
                        {
                          kind: 'move-card',
                          target: 'chosen',
                          from: 'hand',
                          to: 'deck-top',
                        },
                      ],
                    },
                    {
                      id: 'deck-bottom',
                      effects: [
                        {
                          kind: 'move-card',
                          target: 'chosen',
                          from: 'hand',
                          to: 'deck-bottom',
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
  },
);
