import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-finale.json.
export const followingThePath = {
  cardId: 'following-the-path',
  name: 'Following the Path',
  kind: 'event',
  aspects: ['Command', 'Heroism'],
  traits: ['Plan'],
  cost: 1,
  effects: [
    {
      kind: 'search-deck',
      count: 8,
      filter: 'unit',
      trait: 'Force',
      max: 2,
      destination: 'deck-top',
    },
  ],
} as const satisfies EventDefinition;
