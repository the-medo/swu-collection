import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCommission = {
  cardId: 'commission',
  name: 'Commission',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Supply'],
  cost: 1,
  effects: [
    {
      kind: 'search-deck',
      count: 10,
      max: 1,
      filter: 'any',
      cardFilter: {
        anyTrait: ['Bounty Hunter', 'Item', 'Transport'],
      },
    },
  ],
  smuggle: [
    {
      id: 'smuggle',
      cost: 3,
      aspects: ['Command'],
    },
  ],
} as const satisfies EventDefinition;
