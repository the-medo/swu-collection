import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteWartimeProfiteering = {
  cardId: 'wartime-profiteering',
  name: 'Wartime Profiteering',
  kind: 'event',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Supply'],
  cost: 1,
  effects: [
    {
      kind: 'search-deck',
      count: {
        kind: 'difference',
        left: {
          kind: 'unit-history-count',
          event: 'defeated',
          player: 'self',
        },
        right: {
          kind: 'product',
          left: -1,
          right: {
            kind: 'unit-history-count',
            event: 'defeated',
            player: 'enemy',
          },
        },
      },
      max: 1,
      filter: 'any',
      reveal: false,
      min: 1,
    },
  ],
} as const satisfies EventDefinition;
