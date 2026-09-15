import type { LeaderDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-recovery.json.
export const djNeedALift = {
  cardId: 'dj--need-a-lift-',
  name: 'DJ, Need a Lift?',
  kind: 'leader',
  aspects: ['Cunning', 'Cunning'],
  traits: ['Underworld'],
  unique: true,
  printedCost: 6,
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
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'play-card',
                  from: 'hand',
                  filter: {
                    kind: 'unit',
                  },
                  discount: 1,
                  optional: false,
                  bind: 'played',
                  effects: [
                    {
                      kind: 'capture-unit',
                      guard: 'chosen',
                      target: 'played',
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
                amount: 6,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 6,
      arena: 'ground',
      keywords: ['Saboteur'],
      friendlyRescueReady: true,
    },
  },
} as const satisfies LeaderDefinition;
