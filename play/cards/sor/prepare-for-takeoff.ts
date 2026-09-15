import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const prepareForTakeoff = {
  cardId: 'prepare-for-takeoff',
  name: 'Prepare for Takeoff',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Plan'],
  cost: 2,
  effects: [
    {
      kind: 'search-deck',
      count: 8,
      filter: 'unit',
      trait: 'Vehicle',
      max: 2,
    },
  ],
} as const satisfies EventDefinition;
