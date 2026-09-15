import type { LeaderDefinition } from '../definition.ts';

// Official faces and revised timing text are pinned in leader-phase-events.json.
export const padmAmidalaFollowMyLead = {
  cardId: 'padm--amidala--follow-my-lead',
  name: 'Padm\u00e9 Amidala, Follow My Lead',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Naboo', 'Republic', 'Official'],
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
              kind: 'if',
              condition: {
                kind: 'unit-history-at-least',
                event: 'entered',
                amount: 2,
                player: 'self',
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                    enteredThisPhase: true,
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'attack-bound',
                      target: 'chosen',
                      unitsOnly: true,
                      evenIfExhausted: true,
                      optional: false,
                    },
                  ],
                  forAttack: {
                    unitsOnly: true,
                    evenIfExhausted: true,
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
      power: 5,
      hp: 6,
      arena: 'ground',
      triggers: [
        {
          id: 'observe',
          timing: 'attack-ended',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                enteredThisPhase: true,
                otherThan: 'source',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'attack-bound',
                  target: 'chosen',
                  unitsOnly: true,
                  evenIfExhausted: true,
                  optional: false,
                },
              ],
              forAttack: {
                unitsOnly: true,
                evenIfExhausted: true,
              },
            },
          ],
          optional: true,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
