import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const threeLessons = {
  cardId: 'three-lessons',
  name: 'Three Lessons',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Learned'],
  cost: 2,
  effects: [
    {
      kind: 'play-card',
      from: 'hand',
      filter: {
        kind: 'unit',
      },
      optional: false,
      bind: 'played',
      phaseAbilities: {
        keywords: ['Hidden'],
      },
      effects: [
        {
          kind: 'on-unit',
          target: 'played',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: 1,
          },
        },
        {
          kind: 'on-unit',
          target: 'played',
          operation: {
            kind: 'give-token',
            token: 'shield',
            count: 1,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
