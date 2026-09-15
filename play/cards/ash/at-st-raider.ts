import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const atStRaider = {
  cardId: 'at-st-raider',
  name: 'AT-ST Raider',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Vehicle', 'Walker'],
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          unique: false,
          otherThan: 'source',
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Ambush'],
      },
    },
  ],
} as const satisfies UnitDefinition;
