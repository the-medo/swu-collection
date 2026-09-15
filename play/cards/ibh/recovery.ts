import type { EventDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const recovery = {
  cardId: 'recovery',
  name: 'Recovery',
  kind: 'event',
  aspects: ['Heroism'],
  traits: ['Plan'],
  cost: 3,
  effects: [
    {
      kind: 'heal-unit',
      amount: 5,
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
