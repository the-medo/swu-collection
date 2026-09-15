import type { BaseDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const theHolyCity = {
  cardId: 'the-holy-city',
  name: 'The Holy City',
  kind: 'base',
  aspects: ['Cunning'],
  traits: [],
  hp: 28,
  triggers: [
    {
      id: 'force-attack',
      timing: 'friendly-attack',
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          trait: 'Force',
        },
      },
      effects: [
        {
          kind: 'gain-force',
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
