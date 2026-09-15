import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const scourTheArchives = {
  cardId: 'scour-the-archives',
  name: 'Scour the Archives',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Learned'],
  cost: 1,
  effects: [
    {
      kind: 'search-deck',
      count: 8,
      filter: 'upgrade',
      max: 1,
    },
  ],
} as const satisfies EventDefinition;
