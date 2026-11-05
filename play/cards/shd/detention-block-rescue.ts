import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDetentionBlockRescue = {
  cardId: 'detention-block-rescue',
  name: 'Detention Block Rescue',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Gambit'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'damage-target',
          target: 'chosen',
          amount: {
            kind: 'conditional',
            condition: {
              kind: 'numeric-at-least',
              value: {
                kind: 'guarded-cards',
                target: 'chosen',
              },
              amount: 1,
            },
            then: 6,
            otherwise: 3,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
