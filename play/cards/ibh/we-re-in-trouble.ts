import type { EventDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const weReInTrouble = {
  cardId: 'we-re-in-trouble',
  name: "We're In Trouble",
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'damage-unit',
      arena: 'any',
      amount: 3,
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
