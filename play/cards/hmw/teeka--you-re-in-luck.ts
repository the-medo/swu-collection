import { hmwUnit } from './define.ts';

export const hmwTeekaYouReInLuck = hmwUnit('teeka--you-re-in-luck', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'gain-sentinel',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'modify',
                        power: 0,
                        hp: 0,
                        abilities: {
                          keywords: ['Sentinel'],
                        },
                        duration: 'phase',
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'lose-sentinel',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    hasKeyword: 'Sentinel',
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'modify',
                        power: 0,
                        hp: 0,
                        lostKeywords: ['Sentinel'],
                        duration: 'phase',
                      },
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
