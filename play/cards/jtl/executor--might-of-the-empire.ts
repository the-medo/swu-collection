import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const executorMightOfTheEmpire = {
  cardId: 'executor--might-of-the-empire',
  name: 'Executor, Might of the Empire',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 11,
  power: 12,
  hp: 12,
  arena: 'space',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'fighters-played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'tie-fighter',
          count: 3,
        },
      ],
    },
    {
      id: 'fighters-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'tie-fighter',
          count: 3,
        },
      ],
    },
    {
      id: 'fighters-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'tie-fighter',
          count: 3,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
