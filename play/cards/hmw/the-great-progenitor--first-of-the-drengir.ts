import { hmwUnit } from './define.ts';

export const hmwTheGreatProgenitorFirstOfTheDrengir = hmwUnit(
  'the-great-progenitor--first-of-the-drengir',
  {
    triggers: [
      {
        id: 'attack-ended',
        timing: 'attack-ended',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              sameAs: 'source',
            },
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
                ifYouDo: [
                  {
                    kind: 'create-unit',
                    cardId: 'beast',
                    count: {
                      kind: 'upgrades-count',
                      target: 'source',
                      cardId: 'weakness',
                      lastKnown: true,
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
);
