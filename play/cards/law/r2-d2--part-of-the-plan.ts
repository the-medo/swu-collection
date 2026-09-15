import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const r2D2PartOfThePlan = {
  cardId: 'r2-d2--part-of-the-plan',
  name: 'R2-D2, Part of the Plan',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Droid'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 5,
          filter: 'unit',
          cardFilter: {
            sharesFriendlyUnitAspect: true,
          },
          max: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
