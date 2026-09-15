import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const theWrongRide = {
  cardId: 'the-wrong-ride',
  name: 'The Wrong Ride',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Disaster'],
  cost: 3,
  keywords: ['Plot'],
  effects: [
    {
      kind: 'select-resources',
      chooser: 'self',
      player: 'enemy',
      exhausted: 'any',
      min: 2,
      max: 2,
      operation: 'exhaust',
    },
  ],
} as const satisfies EventDefinition;
