import type { UnitDefinition } from '../definition.ts';

// JTL 137. Printed text is pinned in meta-continuous fixture.
export const vonregSTieInterceptorAceOfTheFirstOrder = {
  cardId: 'vonreg-s-tie-interceptor--ace-of-the-first-order',
  name: "Vonreg's TIE Interceptor, Ace of the First Order",
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['First Order', 'Vehicle', 'Fighter'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 4,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          powerAtLeast: 4,
        },
      },
      abilities: {
        keywords: ['Overwhelm'],
      },
    },
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          powerAtLeast: 6,
        },
      },
      abilities: {
        raid: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
