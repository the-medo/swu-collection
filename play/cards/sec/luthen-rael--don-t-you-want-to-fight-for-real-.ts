import type { LeaderDefinition } from '../definition.ts';

// Official faces and revised timing text are pinned in leader-phase-events.json.
export const luthenRaelDonTYouWantToFightForReal = {
  cardId: 'luthen-rael--don-t-you-want-to-fight-for-real-',
  name: "Luthen Rael, Don't You Want to Fight For Real?",
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      triggers: [
        {
          id: 'observe',
          timing: 'friendly-defeated',
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
                  kind: 'select-target',
                  units: {},
                  bind: 'target',
                  optional: false,
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'target',
                      amount: 1,
                    },
                  ],
                  bases: 'any',
                },
              ],
            },
          ],
          condition: {
            kind: 'unit-attacked-this-action',
            target: 'subject',
          },
        },
      ],
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
                amount: 5,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 2,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'observe',
          timing: 'friendly-defeated',
          effects: [
            {
              kind: 'select-target',
              units: {},
              bind: 'target',
              optional: false,
              effects: [
                {
                  kind: 'damage-target',
                  target: 'target',
                  amount: 2,
                },
              ],
              bases: 'any',
            },
          ],
          optional: true,
          condition: {
            kind: 'unit-attacked-this-action',
            target: 'subject',
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
