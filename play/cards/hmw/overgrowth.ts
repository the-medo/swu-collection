import { hmwEvent } from './define.ts';

export const hmwOvergrowth = hmwEvent('overgrowth', [
  {
    kind: 'if',
    condition: {
      kind: 'controls-base-trait',
      trait: 'Kashyyyk',
    },
    effects: [
      {
        kind: 'select-unit',
        filter: {
          controller: 'friendly',
        },
        bind: 'friendly',
        optional: false,
        effects: [
          {
            kind: 'select-unit',
            filter: {
              controller: 'enemy',
            },
            bind: 'enemy',
            optional: false,
            effects: [
              {
                kind: 'on-unit',
                target: 'enemy',
                operation: {
                  kind: 'damage',
                  amount: {
                    kind: 'unit-stat',
                    target: 'friendly',
                    stat: 'power',
                  },
                  source: 'friendly',
                },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    kind: 'self-resource',
    optional: false,
    ready: false,
  },
]);
