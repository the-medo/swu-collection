import type { UnitDefinition } from '../definition.ts';

// Printed text is pinned in the meta-credits fixture.
export const defiantScrapper = {
  cardId: 'defiant-scrapper',
  name: 'Defiant Scrapper',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Fringe'],
  kind: 'unit',
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'credit-played',
      timing: 'played',
      effects: [
        {
          kind: 'defeat-credit',
          controller: 'enemy',
          optional: true,
          effects: [],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
