import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const catAndMouse = {
  cardId: 'cat-and-mouse',
  name: 'Cat and Mouse',
  kind: 'event',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
      },
      bind: 'enemy',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'enemy',
          operation: {
            kind: 'exhaust',
          },
          ifYouDo: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                sameArenaAs: 'enemy',
                powerAtMostUnit: 'enemy',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'ready',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
