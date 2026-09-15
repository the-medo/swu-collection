import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const praetorianGuard = {
  cardId: 'praetorian-guard',
  name: 'Praetorian Guard',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['First Order'],
  cost: 3,
  power: 2,
  hp: 5,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          powerAtLeast: 4,
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
