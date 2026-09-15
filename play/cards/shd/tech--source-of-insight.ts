import type { UnitDefinition } from '../definition.ts';

// Official text is pinned in leader-smuggle.json.
export const techSourceOfInsight = {
  cardId: 'tech--source-of-insight',
  name: 'Tech, Source of Insight',
  kind: 'unit',
  cost: 3,
  aspects: ['Heroism'],
  traits: ['Fringe', 'Clone'],
  smuggle: [
    {
      id: 'smuggle',
      cost: 4,
      aspects: ['Heroism'],
    },
  ],
  resourceSmuggle: [2],
  unique: true,
  power: 2,
  hp: 5,
  arena: 'ground',
} as const satisfies UnitDefinition;
