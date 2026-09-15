import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const lukeSkywalkerICanSaveHim = {
  cardId: 'luke-skywalker--i-can-save-him',
  name: 'Luke Skywalker, I Can Save Him',
  kind: 'leader',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Jedi', 'Rebel'],
  unique: true,
  printedCost: 7,
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
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 7,
              },
            },
          ],
        },
      ],
      triggers: [
        {
          id: 'heal-after-attack',
          timing: 'friendly-attack-ended',
          effects: [
            {
              kind: 'pay',
              costs: [
                {
                  kind: 'exhaust-self',
                },
              ],
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'subject',
                  operation: {
                    kind: 'heal',
                    amount: 1,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    unit: {
      power: 6,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'heal-after-attack',
          timing: 'friendly-attack-ended',
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'heal-attacker',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'subject',
                      operation: {
                        kind: 'heal',
                        amount: 2,
                      },
                    },
                  ],
                },
                {
                  id: 'heal-base',
                  effects: [
                    {
                      kind: 'heal-own-base',
                      amount: 2,
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
