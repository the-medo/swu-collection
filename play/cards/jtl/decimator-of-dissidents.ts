import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 phase history and tokens fixture.
export const decimatorOfDissidents = {
  cardId: 'decimator-of-dissidents',
  name: 'Decimator of Dissidents',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Transport'],
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'space',
  keywords: ['Overwhelm'],
  costReductions: [
    {
      condition: {
        kind: 'phase-event',
        event: 'indirect-damage',
      },
      amount: 1,
    },
  ],
} as const satisfies UnitDefinition;
