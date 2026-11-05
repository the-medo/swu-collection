import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCreativeThinking = {
  cardId: 'creative-thinking',
  name: 'Creative Thinking',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Trick'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        unique: false,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'exhaust',
          },
        },
      ],
    },
    {
      kind: 'create-unit',
      cardId: 'clone-trooper',
      count: 1,
    },
  ],
} as const satisfies EventDefinition;
