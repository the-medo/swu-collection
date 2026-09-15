import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const conveneTheSenate = {
  cardId: 'convene-the-senate',
  name: 'Convene the Senate',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Law'],
  cost: 3,
  effects: [
    {
      kind: 'search-deck',
      count: 8,
      filter: 'unit',
      trait: 'Official',
      max: 2,
    },
    {
      kind: 'create-unit',
      cardId: 'spy',
      count: 1,
    },
  ],
} as const satisfies EventDefinition;
