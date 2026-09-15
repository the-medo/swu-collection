import type { LeaderDefinition } from '../definition.ts';

// ASH 017. Printed text is pinned in the meta token fixture.
export const greefKargaGraciousMagistrate = {
  cardId: 'greef-karga--gracious-magistrate',
  name: 'Greef Karga, Gracious Magistrate',
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Official'],
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
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 6,
              },
            },
          ],
        },
      ],
      triggers: [
        {
          id: 'on-friendly-played',
          timing: 'friendly-played',
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
                    kind: 'give-token',
                    token: 'advantage',
                    count: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          id: 'on-friendly-created',
          timing: 'friendly-created',
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
                    kind: 'give-token',
                    token: 'advantage',
                    count: 1,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'on-friendly-played',
          timing: 'friendly-played',
          effects: [
            {
              kind: 'on-unit',
              target: 'subject',
              operation: {
                kind: 'give-token',
                token: 'advantage',
                count: 1,
              },
            },
          ],
        },
        {
          id: 'on-friendly-created',
          timing: 'friendly-created',
          effects: [
            {
              kind: 'on-unit',
              target: 'subject',
              operation: {
                kind: 'give-token',
                token: 'advantage',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
