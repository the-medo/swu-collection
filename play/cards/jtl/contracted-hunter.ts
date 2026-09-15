import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const contractedHunter = {
  cardId: 'contracted-hunter',
  name: 'Contracted Hunter',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 3,
  power: 4,
  hp: 4,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'regroup-defeat',
      timing: 'regroup-start',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'defeat',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
