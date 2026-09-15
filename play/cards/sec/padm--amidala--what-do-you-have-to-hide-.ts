import type { LeaderDefinition } from '../definition.ts';

// Official faces and revised timing text are pinned in leader-phase-events.json.
export const padmAmidalaWhatDoYouHaveToHide = {
  cardId: 'padm--amidala--what-do-you-have-to-hide-',
  name: 'Padm\u00e9 Amidala, What Do You Have to Hide?',
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Naboo', 'Republic', 'Official'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      triggers: [
        {
          id: 'observe',
          timing: 'own-hand-revealed-or-discarded',
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
                },
              ],
            },
          ],
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
                amount: 6,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 8,
      arena: 'ground',
      triggers: [
        {
          id: 'observe',
          timing: 'own-hand-revealed-or-discarded',
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
            },
          ],
          optional: true,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
