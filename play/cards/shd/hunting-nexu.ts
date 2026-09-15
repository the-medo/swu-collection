import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const huntingNexu = {
  cardId: 'hunting-nexu',
  name: 'Hunting Nexu',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Creature'],
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          anyAspect: ['Aggression'],
          otherThan: 'source',
        },
        amount: 1,
      },
      abilities: {
        raid: 2,
      },
    },
  ],
} as const satisfies UnitDefinition;
