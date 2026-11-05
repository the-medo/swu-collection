import { ic27Unit } from './define.ts';

export const ic27PrincessLeiaCalculatedDistraction = ic27Unit(
  'princess-leia--calculated-distraction',
  {
    triggers: [
      {
        id: 'played',
        timing: 'played',
        effects: [
          {
            kind: 'choose-mode',
            options: [
              {
                id: 'ground',
                effects: [
                  {
                    kind: 'select-units',
                    filter: {
                      arena: 'ground',
                    },
                    bind: 'targets',
                    min: 0,
                    max: 2,
                    budget: {
                      stat: 'cost',
                      max: 4,
                    },
                    effects: [
                      {
                        kind: 'exhaust-group',
                        group: 'targets',
                      },
                    ],
                  },
                ],
              },
              {
                id: 'space',
                effects: [
                  {
                    kind: 'select-units',
                    filter: {
                      arena: 'space',
                    },
                    bind: 'targets',
                    min: 0,
                    max: 2,
                    budget: {
                      stat: 'cost',
                      max: 4,
                    },
                    effects: [
                      {
                        kind: 'exhaust-group',
                        group: 'targets',
                      },
                    ],
                  },
                ],
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
            kind: 'choose-mode',
            options: [
              {
                id: 'ground',
                effects: [
                  {
                    kind: 'select-units',
                    filter: {
                      arena: 'ground',
                    },
                    bind: 'targets',
                    min: 0,
                    max: 2,
                    budget: {
                      stat: 'cost',
                      max: 4,
                    },
                    effects: [
                      {
                        kind: 'exhaust-group',
                        group: 'targets',
                      },
                    ],
                  },
                ],
              },
              {
                id: 'space',
                effects: [
                  {
                    kind: 'select-units',
                    filter: {
                      arena: 'space',
                    },
                    bind: 'targets',
                    min: 0,
                    max: 2,
                    budget: {
                      stat: 'cost',
                      max: 4,
                    },
                    effects: [
                      {
                        kind: 'exhaust-group',
                        group: 'targets',
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
);
