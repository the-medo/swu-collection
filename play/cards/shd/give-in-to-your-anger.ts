import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGiveInToYourAnger = {
  cardId: 'give-in-to-your-anger',
  name: 'Give In to Your Anger',
  kind: 'event',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Innate'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'damage-target',
          target: 'chosen',
          amount: 1,
        },
        {
          kind: 'require-next-attack',
          target: 'chosen',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
