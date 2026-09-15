import type { LeaderDefinition } from '../definition.ts';

// Both printed faces are pinned in leader-foundations.json.
export const emperorPalpatineAccordingToMyDesign = {
  cardId: 'emperor-palpatine--according-to-my-design',
  name: 'Emperor Palpatine, According to My Design',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Force', 'Imperial', 'Sith', 'Official'],
  unique: true,
  printedCost: 7,
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
                controller: 'friendly',
                exhausted: true,
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
                    count: {
                      kind: 'unit-count',
                      filter: {
                        controller: 'friendly',
                        otherThan: 'chosen',
                      },
                    },
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
                amount: 7,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 8,
      arena: 'ground',
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                exhausted: true,
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
                    token: 'advantage',
                    count: {
                      kind: 'unit-count',
                      filter: {
                        controller: 'friendly',
                        otherThan: 'chosen',
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
