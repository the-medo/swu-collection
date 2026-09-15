import type { LeaderDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-recovery.json.
export const sabineWrenBargainingOnBelief = {
  cardId: 'sabine-wren--bargaining-on-belief',
  name: 'Sabine Wren, Bargaining on Belief',
  kind: 'leader',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Jedi', 'Mandalorian', 'Spectre'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'advantage',
                    count: 2,
                  },
                  creatorOf: 'chosen',
                  ifYouDo: [
                    {
                      kind: 'next-play',
                      filter: {
                        kind: 'unit',
                      },
                      phaseAbilities: {
                        keywords: ['Shielded'],
                      },
                    },
                  ],
                },
              ],
              chooser: 'enemy',
            },
          ],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 5,
      arena: 'ground',
      triggers: [
        {
          id: 'observe',
          timing: 'attack',
          effects: [
            {
              kind: 'next-play',
              filter: {
                kind: 'unit',
              },
              phaseAbilities: {
                keywords: ['Shielded'],
              },
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
