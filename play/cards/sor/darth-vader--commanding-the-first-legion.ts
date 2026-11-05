import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDarthVaderCommandingTheFirstLegion = {
  cardId: 'darth-vader--commanding-the-first-legion',
  name: 'Darth Vader, Commanding the First Legion',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Force', 'Imperial', 'Sith'],
  cost: 7,
  unique: true,
  power: 5,
  hp: 7,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 10,
          max: 10,
          filter: 'unit',
          anyAspect: ['Villainy'],
          maxTotalCost: 3,
          play: {
            discount: 0,
            free: true,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
