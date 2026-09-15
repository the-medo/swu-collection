import type { EventDefinition } from '../definition.ts';

export const recruit = {
  cardId: 'recruit',
  traits: ['Supply'],
  name: 'Recruit',
  kind: 'event',
  aspects: ['Command'],
  cost: 1,
  effects: [{ kind: 'search-deck', count: 5, filter: 'unit', max: 1 }],
} as const satisfies EventDefinition;
