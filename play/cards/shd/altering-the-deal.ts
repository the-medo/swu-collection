import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAlteringTheDeal = {
  cardId: 'altering-the-deal',
  name: 'Altering the Deal',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Trick'],
  cost: 1,
  effects: [
    {
      kind: 'select-captured',
      bind: 'captive',
      optional: false,
      effects: [
        {
          kind: 'discard-captured',
          target: 'captive',
        },
      ],
      guardFilter: {
        controller: 'friendly',
      },
    },
  ],
} as const satisfies EventDefinition;
