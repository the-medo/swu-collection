import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const itSNotOverYet = {
  cardId: 'it-s-not-over-yet',
  name: "It's Not Over Yet",
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Innate'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        attackedThisPhase: false,
        enteredThisPhase: false,
      },
      bind: 'chosen',
      optional: true,
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
    {
      kind: 'create-unit',
      cardId: 'spy',
      count: 1,
    },
  ],
} as const satisfies EventDefinition;
