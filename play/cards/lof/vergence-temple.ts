import type { BaseDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const vergenceTemple = {
  cardId: 'vergence-temple',
  name: 'Vergence Temple',
  kind: 'base',
  aspects: ['Vigilance'],
  traits: [],
  hp: 25,
  triggers: [
    {
      id: 'regroup-force',
      timing: 'regroup-start',
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          remainingHpAtLeast: 4,
        },
        amount: 1,
      },
      effects: [
        {
          kind: 'gain-force',
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
