import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const theLegacyRunDoomedDebris = {
  cardId: 'the-legacy-run--doomed-debris',
  name: 'The Legacy Run, Doomed Debris',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Republic', 'Vehicle', 'Transport'],
  unique: true,
  cost: 5,
  power: 3,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'falling-debris',
      timing: 'defeated',
      effects: [
        {
          kind: 'divide-damage',
          amount: 6,
          filter: {
            controller: 'enemy',
          },
          optional: false,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
