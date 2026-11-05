import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteIHadNoChoice = {
  cardId: 'i-had-no-choice',
  name: 'I Had No Choice',
  kind: 'event',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Trick'],
  cost: 7,
  effects: [
    {
      kind: 'select-units',
      filter: {
        nonLeader: true,
      },
      bind: 'chosen',
      min: 0,
      max: 2,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            inGroup: 'chosen',
          },
          optional: false,
          bind: 'returned',
          effects: [
            {
              kind: 'on-unit',
              target: 'returned',
              operation: {
                kind: 'return-to-hand',
              },
            },
            {
              kind: 'each-unit',
              filter: {
                inGroup: 'chosen',
                otherThan: 'returned',
              },
              bind: 'recipient',
              effects: [
                {
                  kind: 'unit-to-deck',
                  target: 'recipient',
                  position: 'bottom',
                },
              ],
            },
          ],
          chooser: 'enemy',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
