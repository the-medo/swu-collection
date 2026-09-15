import type { UnitDefinition } from '../definition.ts';

// JTL 252. Printed text is pinned in meta-board fixture.
export const tantiveIvFleeingTheEmpire = {
  cardId: 'tantive-iv--fleeing-the-empire',
  name: 'Tantive IV, Fleeing the Empire',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 7,
  power: 5,
  hp: 7,
  arena: 'space',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'x-wing',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
