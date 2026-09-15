import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const stockpile = {
  cardId: 'stockpile',
  name: 'Stockpile',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Supply'],
  cost: 6,
  effects: [
    {
      kind: 'self-resource',
      optional: false,
      ready: false,
    },
    {
      kind: 'resource-top',
      optional: false,
      ready: false,
    },
  ],
} as const satisfies EventDefinition;
