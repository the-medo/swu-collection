import type { EventDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const tooStrongForBlasters = {
  cardId: 'too-strong-for-blasters',
  name: 'Too Strong for Blasters',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Innate'],
  cost: 1,
  effects: [
    {
      kind: 'heal-unit',
      amount: 2,
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
