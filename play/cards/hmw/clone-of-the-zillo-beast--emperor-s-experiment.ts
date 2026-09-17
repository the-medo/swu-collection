import { hmwUnit } from './define.ts';

export const hmwCloneOfTheZilloBeastEmperorSExperiment = hmwUnit(
  'clone-of-the-zillo-beast--emperor-s-experiment',
  {
    auras: [
      {
        id: 'crushing-presence',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
        },
        power: -2,
        hp: -2,
      },
    ],
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'select-unit',
            filter: {},
            bind: 'chosen',
            optional: true,
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
);
