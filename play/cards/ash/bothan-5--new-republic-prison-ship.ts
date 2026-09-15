import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 optional triggers fixture.
export const bothan5NewRepublicPrisonShip = {
  cardId: 'bothan-5--new-republic-prison-ship',
  name: 'Bothan-5, New Republic Prison Ship',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['New Republic', 'Vehicle', 'Transport'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'space',
  triggers: [
    {
      id: 'rescue-defeated',
      timing: 'friendly-defeated',
      effects: [
        {
          kind: 'capture-unit',
          guard: 'source',
          target: 'subject',
          from: 'discard',
        },
      ],
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          withoutTrait: 'Vehicle',
        },
      },
      excludeSelf: true,
      optional: true,
      limit: 'once-per-round',
    },
  ],
} as const satisfies UnitDefinition;
