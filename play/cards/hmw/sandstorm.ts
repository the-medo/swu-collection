import { hmwEvent } from './define.ts';

export const hmwSandstorm = hmwEvent(
  'sandstorm',
  [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'ground',
          effects: [
            {
              kind: 'each-unit',
              filter: {
                controller: 'enemy',
                arena: 'ground',
                exhausted: true,
              },
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'weakness',
                    count: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          id: 'space',
          effects: [
            {
              kind: 'each-unit',
              filter: {
                controller: 'enemy',
                arena: 'space',
                exhausted: true,
              },
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'weakness',
                    count: 1,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  {
    costReductions: [
      {
        condition: {
          kind: 'controls-base-trait',
          trait: 'Tatooine',
        },
        amount: 1,
      },
    ],
  },
);
