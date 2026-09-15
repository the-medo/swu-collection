import type { LeaderDefinition } from '../definition.ts';

// ASH 014. Printed text is pinned in meta-board fixture.
export const theMandalorianWeCanTKeepRunning = {
  cardId: 'the-mandalorian--we-can-t-keep-running',
  name: "The Mandalorian, We Can't Keep Running",
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Mandalorian'],
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 6,
              },
              as: 'unit',
            },
          ],
        },
      ],
      triggers: [
        {
          id: 'on-initiative-taken',
          timing: 'initiative-taken',
          effects: [
            {
              kind: 'pay',
              costs: [
                {
                  kind: 'resources',
                  amount: 1,
                },
              ],
              optional: true,
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 6,
      arena: 'ground',
      keywords: ['Support'],
      triggers: [
        {
          id: 'on-attack',
          timing: 'attack',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'initiative',
              },
              effects: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'draw',
                      effects: [
                        {
                          kind: 'draw-cards',
                          amount: 1,
                        },
                      ],
                    },
                    {
                      id: 'decline',
                      effects: [],
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
} as const satisfies LeaderDefinition;
