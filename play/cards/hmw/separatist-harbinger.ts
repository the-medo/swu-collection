import { hmwUnit } from './define.ts';

export const hmwSeparatistHarbinger = hmwUnit('separatist-harbinger', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-target',
          units: {
            controller: 'enemy',
          },
          bases: 'enemy',
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'deal-damage',
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'chosen',
                      amount: 2,
                    },
                  ],
                },
                {
                  id: 'skip',
                  effects: [],
                },
              ],
            },
          ],
          chooser: 'enemy',
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-target',
          units: {
            controller: 'enemy',
          },
          bases: 'enemy',
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'deal-damage',
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'chosen',
                      amount: 2,
                    },
                  ],
                },
                {
                  id: 'skip',
                  effects: [],
                },
              ],
            },
          ],
          chooser: 'enemy',
        },
      ],
    },
  ],
});
