import { ic27Unit } from './define.ts';

export const ic27GrandAdmiralThrawnListenToMeCarefully = ic27Unit(
  'grand-admiral-thrawn--listen-to-me-carefully',
  {
    triggers: [
      {
        id: 'played',
        timing: 'played',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              controller: 'friendly',
              otherThan: 'source',
            },
            bind: 'chosen',
            optional: true,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'give-token',
                  token: 'experience',
                  count: 1,
                },
              },
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'modify',
                  power: 0,
                  hp: 0,
                  duration: 'phase',
                  abilities: {
                    keywords: ['Sentinel'],
                  },
                },
              },
            ],
          },
        ],
      },
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              controller: 'friendly',
              otherThan: 'source',
            },
            bind: 'chosen',
            optional: true,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'give-token',
                  token: 'experience',
                  count: 1,
                },
              },
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'modify',
                  power: 0,
                  hp: 0,
                  duration: 'phase',
                  abilities: {
                    keywords: ['Sentinel'],
                  },
                },
              },
            ],
          },
        ],
      },
      {
        id: 'defeated',
        timing: 'defeated',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              controller: 'friendly',
              otherThan: 'source',
            },
            bind: 'chosen',
            optional: true,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'give-token',
                  token: 'experience',
                  count: 1,
                },
              },
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'modify',
                  power: 0,
                  hp: 0,
                  duration: 'phase',
                  abilities: {
                    keywords: ['Sentinel'],
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  },
);
