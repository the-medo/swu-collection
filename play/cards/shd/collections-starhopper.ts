import type { UnitDefinition } from '../definition.ts';

// Official text is pinned in leader-smuggle.json.
export const collectionsStarhopper = {
  cardId: 'collections-starhopper',
  name: 'Collections Starhopper',
  kind: 'unit',
  cost: 2,
  aspects: ['Command'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  smuggle: [
    {
      id: 'smuggle',
      cost: 3,
      aspects: ['Command'],
    },
  ],
  power: 2,
  hp: 2,
  arena: 'space',
} as const satisfies UnitDefinition;
