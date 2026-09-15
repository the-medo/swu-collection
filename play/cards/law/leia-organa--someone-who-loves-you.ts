import type { LeaderDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-aspect-abilities fixture.
export const leiaOrganaSomeoneWhoLovesYou = {
  cardId: 'leia-organa--someone-who-loves-you',
  name: 'Leia Organa, Someone Who Loves You',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel'],
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'aspect-strength',
          costs: [
            {
              kind: 'resources',
              amount: 2,
            },
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {},
              optional: false,
              allowMissing: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: {
                      kind: 'distinct-aspects',
                      target: 'chosen',
                    },
                    hp: {
                      kind: 'distinct-aspects',
                      target: 'chosen',
                    },
                    duration: 'phase',
                  },
                },
              ],
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
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 2,
      hp: 2,
      arena: 'ground',
      keywords: ['Overwhelm'],
      triggers: [
        {
          id: 'deployed-experience',
          timing: 'deployed',
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {},
              optional: false,
              allowMissing: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'experience',
                    count: {
                      kind: 'unit-aspects',
                      filter: {
                        controller: 'friendly',
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
