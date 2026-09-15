import type { LeaderDefinition } from '../definition.ts';

// Official face text and clarifications are pinned in leader-private-choices.json.
export const hunterOutcastSergeant = {
  cardId: 'hunter--outcast-sergeant',
  name: 'Hunter, Outcast Sergeant',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Fringe', 'Clone'],
  unique: true,
  printedCost: 7,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'resources',
              player: 'self',
              chooser: 'self',
              filter: {},
              min: 1,
              max: 1,
              bind: 'resource',
              effects: [
                {
                  kind: 'reveal-card',
                  target: 'resource',
                },
                {
                  kind: 'if',
                  condition: {
                    kind: 'units-at-least',
                    filter: {
                      controller: 'friendly',
                      unique: true,
                      sameNameAs: 'resource',
                    },
                    amount: 1,
                  },
                  effects: [
                    {
                      kind: 'move-card',
                      target: 'resource',
                      from: 'resources',
                      to: 'hand',
                      effects: [
                        {
                          kind: 'resource-top',
                          ready: false,
                          optional: false,
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
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 7,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 5,
      hp: 8,
      arena: 'ground',
      keywords: ['Overwhelm'],
      triggers: [
        {
          id: 'observe',
          timing: 'attack',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'resources',
              player: 'self',
              chooser: 'self',
              filter: {},
              min: 1,
              max: 1,
              bind: 'resource',
              effects: [
                {
                  kind: 'reveal-card',
                  target: 'resource',
                },
                {
                  kind: 'if',
                  condition: {
                    kind: 'units-at-least',
                    filter: {
                      controller: 'friendly',
                      unique: true,
                      sameNameAs: 'resource',
                    },
                    amount: 1,
                  },
                  effects: [
                    {
                      kind: 'move-card',
                      target: 'resource',
                      from: 'resources',
                      to: 'hand',
                      effects: [
                        {
                          kind: 'resource-top',
                          ready: false,
                          optional: false,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          optional: true,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
