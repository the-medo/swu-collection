import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const sithLegionnaire = {
  cardId: 'sith-legionnaire',
  name: 'Sith Legionnaire',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Sith', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          anyAspect: ['Villainy'],
          otherThan: 'source',
        },
        amount: 1,
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
