import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const puttingATeamTogether = {
  cardId: 'putting-a-team-together',
  name: 'Putting a Team Together',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Plan'],
  cost: 1,
  effects: [
    {
      kind: 'search-deck',
      count: 8,
      filter: 'unit',
      anyAspect: ['Vigilance', 'Aggression', 'Cunning'],
      max: 1,
    },
  ],
} as const satisfies EventDefinition;
