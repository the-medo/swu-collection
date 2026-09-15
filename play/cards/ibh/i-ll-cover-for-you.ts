import type { EventDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const iLlCoverForYou = {
  cardId: 'i-ll-cover-for-you',
  name: "I'll Cover For You",
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'damage-units',
      filter: {
        controller: 'enemy',
      },
      amount: 1,
      max: 2,
      mandatory: true,
    },
  ],
} as const satisfies EventDefinition;
