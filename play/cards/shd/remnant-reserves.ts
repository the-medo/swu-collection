import type { EventDefinition } from '../definition.ts';

export const remnantReserves = {
  cardId: 'remnant-reserves',
  traits: ['Supply'],
  name: 'Remnant Reserves',
  kind: 'event',
  aspects: ['Villainy', 'Command'],
  cost: 4,
  effects: [{ kind: 'search-deck', count: 5, filter: 'unit', max: 3 }],
} as const satisfies EventDefinition;
