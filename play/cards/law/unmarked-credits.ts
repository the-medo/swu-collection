import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const unmarkedCredits = {
  cardId: 'unmarked-credits',
  name: 'Unmarked Credits',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Supply'],
  cost: 1,
  effects: [
    {
      kind: 'create-credits',
      amount: 1,
    },
  ],
} as const satisfies EventDefinition;
