import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSearchYourFeelings = {
  cardId: 'search-your-feelings',
  name: 'Search Your Feelings',
  kind: 'event',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Innate'],
  cost: 4,
  effects: [
    {
      kind: 'search-deck',
      count: {
        kind: 'zone-size',
        zone: 'deck',
        player: 'self',
      },
      max: 1,
      filter: 'any',
      reveal: false,
    },
  ],
} as const satisfies EventDefinition;
